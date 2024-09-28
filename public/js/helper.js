// Upload preview image
const formCreateHelper = document.querySelector("[form-create-helper]");

if (formCreateHelper) {
    const uploadHealthCertificateInput = formCreateHelper.querySelector("[upload-healthCertificate-input]");
    const uploadHealthCertificatePreview = formCreateHelper.querySelector("[upload-healthCertificate-preview]");

    uploadHealthCertificateInput.addEventListener("change", () => {
        const files = uploadHealthCertificateInput.files;
        uploadHealthCertificatePreview.innerHTML = "";

        for (let i = 0; i < files.length; i++) {
            const reader = new FileReader();

            reader.onloadend = (e) => {
                const img = document.createElement("img");
                img.src = e.target.result;
                img.classList.add("image-preview");
                uploadHealthCertificatePreview.appendChild(img);
            };

            reader.readAsDataURL(files[i]);
        }
    })
}
// End Upload preview image

// Display district when select province
const workingArea = document.querySelector("[workingArea]");

if (workingArea) {
    const chooseProvinceSelect = workingArea.querySelector("[chooseProvinceSelect]");

    chooseProvinceSelect.addEventListener("change", (e) => {
        fetch(`/admin/locations/fetch?province=${e.target.value}`)
            .then(response => response.json())
            .then(data => {
                const chooseDistricts = workingArea.querySelector("[chooseDistricts]");
                chooseDistricts.innerHTML = "";

                data.forEach(location => {
                    location.districts.forEach(item => {
                        const div = document.createElement('div');

                        div.innerHTML = `
                            <input type="checkbox" name="districts" value=${item.district.split(" ").join(",")}>
                            <label>${item.district}</label>
                        `;

                        chooseDistricts.appendChild(div);
                    })
                })
            })
                
    })
}
// End Display district when select province