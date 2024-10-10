// Display start/end time input
const timeOption = ["0", "60", "120", "180", "240", "300", "360", "420", "480", "540", "600",
                    "660", "720", "780", "840", "900", "960", "1020", "1080", "1140", "1200",
                    "1260", "1320", "1380"
];

const chooseStartTimeSelect = document.querySelector("[chooseStartTimeSelect]");
const chooseEndTimeSelect = document.querySelector("[chooseEndTimeSelect]");

if (chooseStartTimeSelect) {
    chooseStartTimeSelect.innerHTML = "";

    for (let startTime of timeOption) {
        const option = document.createElement("option");
        const hour = (startTime - (startTime % 60)) / 60;
        const minute = startTime % 60;

        option.textContent = `${hour} giờ ${minute} phút`; 
        option.value = `${startTime}`;
        chooseStartTimeSelect.appendChild(option);
    }
} 

if (chooseStartTimeSelect) {
    chooseStartTimeSelect.innerHTML = "";

    for (let startTime of timeOption) {
        const option = document.createElement("option");
        const hour = (startTime - (startTime % 60)) / 60;
        const minute = startTime % 60;

        option.textContent = `${hour} giờ ${minute} phút`; 
        option.value = `${startTime}`;
        chooseStartTimeSelect.appendChild(option);
    }
}

if (chooseEndTimeSelect) {
    chooseEndTimeSelect.innerHTML = "";

    for (let endTime of timeOption) {
        const option = document.createElement("option");
        const hour = (endTime - (endTime % 60)) / 60;
        const minute = endTime % 60;

        option.textContent = `${hour} giờ ${minute} phút`; 
        option.value = `${endTime}`;
        chooseEndTimeSelect.appendChild(option);
    }
} 