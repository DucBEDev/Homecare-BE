// Display start/end time input
const timeOption = ["0", "60", "120", "180", "240", "300", "360", "420", "480", "540", "600",
                    "660", "720", "780", "840", "900", "960", "1020", "1080", "1140", "1200",
                    "1260", "1320", "1380"];

const chooseStartTimeSelect = document.querySelector("[chooseStartTimeSelect]");
const chooseEndTimeSelect = document.querySelector("[chooseEndTimeSelect]");

if (chooseStartTimeSelect) {
    chooseStartTimeSelect.innerHTML = "";
    const startHour = chooseStartTimeSelect.getAttribute("data");

    for (let startTime of timeOption) {
        const option = document.createElement("option");
        const hour = (startTime - (startTime % 60)) / 60;
        const minute = startTime % 60;

        option.textContent = `${hour} giờ ${minute} phút`; 
        option.value = `${startTime}`;
        option.selected = (startHour == startTime) ? true : false;
        chooseStartTimeSelect.appendChild(option);
    }
} 

if (chooseEndTimeSelect) {
    chooseEndTimeSelect.innerHTML = "";
    const endHour = chooseEndTimeSelect.getAttribute("data");

    for (let endTime of timeOption) {
        const option = document.createElement("option");
        const hour = (endTime - (endTime % 60)) / 60;
        const minute = endTime % 60;

        option.textContent = `${hour} giờ ${minute} phút`; 
        option.value = `${endTime}`;
        option.selected = (endHour == endTime) ? true : false;
        chooseEndTimeSelect.appendChild(option);
    }
} 