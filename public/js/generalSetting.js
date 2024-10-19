// Display start/end time input
const timeOption = ["0", "60", "120", "180", "240", "300", "360", "420", "480", "540", "600",
                    "660", "720", "780", "840", "900", "960", "1020", "1080", "1140", "1200",
                    "1260", "1320", "1380"];

const chooseTimeSelect = document.querySelectorAll("[chooseTimeSelect]");

if (chooseTimeSelect.length > 0) {
    for (const select of chooseTimeSelect) {
        select.innerHTML = "";
        const data = select.getAttribute("data");
    
        for (let time of timeOption) {
            const option = document.createElement("option");
            const hour = (time - (time % 60)) / 60;
            const minute = time % 60;
    
            option.textContent = `${hour} giờ ${minute} phút`; 
            option.value = `${time}`;
            option.selected = (data == time) ? true : false;
            select.appendChild(option);
        }
    }
} 
