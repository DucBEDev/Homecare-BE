// Display district when select province
const requestArea = document.querySelector("[requestArea]");

if (requestArea) {
    const chooseProvinceSelect = requestArea.querySelector("[chooseProvinceSelect]");
    chooseProvinceSelect.addEventListener("change", (e) => {
        fetch(`/admin/locations/fetch?province=${e.target.value}`)
            .then(response => response.json())
            .then(data => {
                const chooseDistricts = requestArea.querySelector("[chooseDistrictSelect]");
                chooseDistricts.innerHTML = "";

                data.forEach(location => {
                    location.districts.forEach(item => {
                        const option = document.createElement("option");
                        
                        option.textContent = item.district; 
                        option.value = item.district;
                        chooseDistricts.appendChild(option);
                    })
                })
            })          
    })
}
// End Display district when select province

// Display input request date for short/long-term
const requestTypes = document.querySelectorAll("input[name='requestType']");

if (requestTypes.length > 0) {
    const shortTerm = document.querySelector("[shortTerm]");
    const longTerm = document.querySelector("[longTerm]");

    requestTypes.forEach(type => {
        type.addEventListener("change", (e) => {
            const type = e.target.value;

            if (type == "shortTerm") {
                longTerm.innerHTML = "";

                shortTerm.innerHTML = `
                    <label for="startDate">Ngày làm việc *</label>
                    <input class="form-control" type="date" id="requestDate" name="startDate"/>
                `
            }
            else {
                shortTerm.innerHTML = "";

                longTerm.innerHTML = `
                    <div>
                        <label for="requestDate">Ngày làm việc *</label>
                    </div>
                    
                    <label for="startDate">Từ: </label>
                    <input class="form-control" type="date" id="requestDate" name="startDate" />
                    
                    <label for="endDate">Đến: </label>
                    <input class="form-control" type="date" id="requestDate" name="endDate" />
                `
            }
        })
    })
}
// End Display input request date for short/long-term

// Display start/end time input
const timeOption = ["360","390","420","450","480","510","540","570","600","630",
                    "660","690","720","750","780","810","840","870","900","930",
                    "960","990","1020","1050","1080","1110","1140","1170","1200"];

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
if (chooseEndTimeSelect) {
    chooseEndTimeSelect.innerHTML = "";

    for (let startTime of timeOption) {
        const option = document.createElement("option");
        const hour = (startTime - (startTime % 60)) / 60;
        const minute = startTime % 60;

        option.textContent = `${hour} giờ ${minute} phút`; 
        option.value = `${startTime}`;
        chooseEndTimeSelect.appendChild(option);
    }
} 
// End Display start/end time input

