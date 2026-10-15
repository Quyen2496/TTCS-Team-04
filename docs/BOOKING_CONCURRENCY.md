# Booking room/night reservation

This project uses MongoDB. MongoDB does not provide PostgreSQL-style range
exclusion constraints, so bookings are represented in the database by one
`BookingRoomNight` document for each calendar night in `[checkIn, checkOut)`.
The unique compound index on `(roomId, night)` is the database-level guard
against two bookings claiming the same room on the same night.

The reservation rows are inserted before the booking is saved. If a reservation
conflicts, the unique index rejects it and the service tries another room; if
the booking save fails, the service removes its reservation rows. This works on
standalone MongoDB and does not require transactions. A process crash between
the reservation insert and booking save can leave an orphan row temporarily;
startup cleanup removes stale orphan rows. Reservations for cancelled and
completed bookings are also removed during startup.

Cancellation marks the booking cancelled, deletes its reservation rows, and
then returns success. Availability is calculated from these rows, so the room
is available as soon as the cancellation API returns.

On startup, the server builds the unique index and migrates active legacy
bookings by assigning a physical room and creating their room/night records.
The server does not accept requests if that migration finds conflicting legacy
bookings that cannot fit in the current room inventory.

To exercise the 200-request contention scenario, start the API against a test
database with exactly one available room for the configured dates, then run:

```sh
node scripts/test-s3-02.js
```

The script checks the HTTP outcomes, the persisted booking and nightly records,
and that cancellation immediately restores availability. It leaves the created
booking in `CANCELLED` status for inspection.
