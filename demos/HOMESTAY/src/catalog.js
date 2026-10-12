// Bộ dữ liệu mẫu v2. Ảnh được đóng gói trong public/assets/rooms.
const amenityCatalog=[
 ['Wi-Fi','📶'],['Điều hoà','❄️'],['Bữa sáng','☕'],['Ban công','🌤️'],['Bãi đỗ xe','🚗'],['TV thông minh','📺'],['Tủ lạnh mini','🧊'],['Ấm đun nước','🫖'],['Máy sấy tóc','💨'],['Nước nóng','🚿'],['Khăn tắm','🧺'],['Đồ vệ sinh cá nhân','🧴'],['Bàn làm việc','💻'],['Tủ quần áo','👔'],['Két an toàn','🔐'],['Bồn tắm','🛁'],['Bếp riêng','🍳'],['Dụng cụ nấu ăn','🥣'],['Máy giặt','🫧'],['Bàn ăn','🍽️'],['Sofa','🛋️'],['Cửa sổ lớn','🪟'],['View vườn','🌿'],['View hồ','🏞️'],['Sân hiên','🏡'],['Hồ bơi','🏊'],['Khu BBQ','🔥'],['Giường trẻ em','🧸'],['Thang máy','↕️'],['Dịch vụ dọn phòng','🧹']
];
const typeCatalog=[
 ['Phòng đơn',1,2,350000,450000,18,'Căn phòng gọn gàng với giường đơn, bàn làm việc và cửa sổ đón ánh sáng.',[0,1,5,8,9,10,11,12,13,21]],
 ['Phòng đôi',2,3,550000,650000,26,'Không gian thư giãn với giường đôi, tủ lạnh mini và góc nghỉ ngơi.',[0,1,2,5,6,7,8,9,10,11,13,21]],
 ['Phòng gia đình',4,6,850000,1000000,42,'Phòng rộng cho gia đình, có sofa, bàn ăn và tiện nghi cho trẻ nhỏ.',[0,1,2,3,5,6,9,10,11,13,19,20,27]],
 ['Deluxe ban công',2,3,750000,900000,32,'Phòng Deluxe có ban công riêng, giường đôi và góc uống trà.',[0,1,2,3,5,6,7,8,9,10,14,21]],
 ['Suite nghỉ dưỡng',2,4,1200000,1450000,56,'Suite rộng rãi với khu tiếp khách, bồn tắm và không gian nghỉ riêng.',[0,1,2,3,5,6,7,8,9,14,15,20,21]],
 ['Studio có bếp',2,3,680000,820000,35,'Studio phù hợp lưu trú dài ngày, có bếp và bàn ăn trong phòng.',[0,1,5,6,7,9,10,12,16,17,18,19]],
 ['Bungalow sân vườn',2,4,950000,1150000,38,'Căn bungalow độc lập, sân hiên và góc thư giãn gần khu vườn.',[0,1,2,4,6,7,9,10,22,24,26]],
 ['Loft gác lửng',2,4,780000,920000,40,'Phòng phong cách loft với gác lửng, góc làm việc và cửa sổ lớn.',[0,1,5,6,7,9,10,12,20,21]],
 ['Phòng twin',2,3,600000,720000,28,'Hai giường riêng phù hợp bạn bè hoặc đồng nghiệp cùng chuyến đi.',[0,1,2,5,6,7,8,9,10,11,12,13]],
 ['Phòng nhóm',4,6,900000,1080000,46,'Phòng nhiều giường với bàn sinh hoạt chung, dành cho nhóm bạn.',[0,1,4,5,6,7,9,10,11,13,19,22,26]]
];
module.exports={amenityCatalog,typeCatalog};
