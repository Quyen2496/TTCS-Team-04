const cancellationService = require('./cancellation.service');



/**

 * Controller: Lấy preview thông tin huỷ phòng

 */

const getCancelPreview = async (req, res, next) => {

  try {

    const { id } = req.params;

    const result = await cancellationService.previewCancelBooking(id);



    return res.status(200).json({

      success: true,

      message: 'Lấy thông tin preview huỷ booking thành công.',

      data: result

    });

  } catch (error) {

    next(error);

  }

};



/**

 * Controller: Thực hiện huỷ phòng

 */

const cancelBooking = async (req, res, next) => {

  try {

    const { id } = req.params;

    const { reason, expectedVersion } = req.body;

    const actor = req.user ? req.user.email : 'System/Receptionist';



    const result = await cancellationService.commitCancelBooking({

      bookingId: id,

      reason,

      expectedVersion,

      actor

    });



    return res.status(200).json({

      success: true,

      message: 'Huỷ booking thành công.',

      data: result

    });

  } catch (error) {

    next(error);

  }

};



module.exports = {

  getCancelPreview,

  cancelBooking

}; 

