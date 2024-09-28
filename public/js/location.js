// Display districts when user click on province name
const chooseProvince = document.querySelectorAll("[chooseProvince]");

chooseProvince.forEach(province => {
  province.addEventListener("click", () => {
    const provinceName = province.querySelector("span").getAttribute("data-name");

    // Fetch locations 
    fetch(`/admin/locations/fetch?province=${provinceName}`)
      .then(response => response.json())
      .then(data => {
        const displayDistricts = document.querySelector("[displayDistricts]");
        displayDistricts.innerHTML = "";

        data.forEach(location => {
          location.districts.forEach(item => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
              <td>${item.district}</td>
              <td>${location.province}</td>
              <td>
                <button class="btn btn-danger btn-sm" button-delete-district province-id=${location._id} district-id=${item._id}>Xóa</button>
              </td>
            `;

            displayDistricts.appendChild(tr);
          });
        });
      })
      .finally(() => {
        // Delete district
        const buttonDeleteDistrict = document.querySelectorAll("[button-delete-district]");

        if (buttonDeleteDistrict.length > 0) {
          const formDeleteLocation = document.querySelector("#form-delete-location");
          const path = formDeleteLocation.getAttribute("data-path");

          buttonDeleteDistrict.forEach(button => {
            button.addEventListener("click", () => {
              const isConfirm = confirm("Bạn có chắc chắn muốn xóa không?");

              if (isConfirm) {
                const provinceId = button.getAttribute("province-id");
                const districtId = button.getAttribute("district-id");
                const action = path + `District/${provinceId}/${districtId}?_method=DELETE`;

                formDeleteLocation.action = action;
                formDeleteLocation.submit();
              }
            })
          })
        }
      })
  })
})
// End Display districts when user click on province name

// Form delete item
  // Delete province
  const buttonDeleteProvince = document.querySelectorAll("[button-delete-province]");

  if (buttonDeleteProvince.length > 0) {
    const formDeleteLocation = document.querySelector("#form-delete-location");
    const path = formDeleteLocation.getAttribute("data-path");

    buttonDeleteProvince.forEach(button => {
      button.addEventListener("click", () => {
        const isConfirm = confirm("Bạn có chắc chắn muốn xóa không?");

        if (isConfirm) {
          const id = button.getAttribute("data-id");
          const action = path + `Province/${id}?_method=DELETE`
  
          formDeleteLocation.action = action;
          formDeleteLocation.submit();
        }
      })
    })
  }
  // End Delete province
// End Form delete item