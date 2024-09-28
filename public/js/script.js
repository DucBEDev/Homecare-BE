// Upload Image
const uploadImage = document.querySelector("[upload-image]");
if (uploadImage) {
    const uploadImageInput = document.querySelector("[upload-image-input]");
    const uploadImagePreview = document.querySelector("[upload-image-preview]");
    
    uploadImageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];

        if (file) {
            uploadImagePreview.src = URL.createObjectURL(file);  
        }
    });
}
// End Upload Image

// Show alert
const showAlert = document.querySelector("[show-alert]");

if (showAlert) {
    const time = parseInt(showAlert.getAttribute("data-time"));
    const closeAlert = showAlert.querySelector("[close-alert]");

    setTimeout(() => {
        showAlert.classList.add("alert-hidden");
    }, time);

    closeAlert.addEventListener("click", () => {
        showAlert.classList.add("alert-hidden");
    });
}
// End Show alert

// Button Status
const buttonsStatus = document.querySelectorAll("[button-status]");

if (buttonsStatus.length > 0) {
    let url = new URL(window.location.href);

    buttonsStatus.forEach(button => {
        button.addEventListener("click", () => {
            const status = button.getAttribute("button-status");
            
            if (status) {
                url.searchParams.set("status", status);
            }
            else {
                url.searchParams.delete("status");
            }

            window.location.href = url;
        });
    });
}
// End Button Status

// Search
const formSearch = document.querySelector("#form-search");

if (formSearch) {
    formSearch.addEventListener("submit", (e) => {
        e.preventDefault();
        
        let url = new URL(window.location.href);
        const keyword = e.target.elements.keyword.value;

        if (keyword) {
            url.searchParams.set("keyword", keyword);
        }
        else {
            url.searchParams.delete("keyword");
        }

        window.location.href = url;
    })
}
// End Search

// Check box multi
const checkboxMulti = document.querySelector("[checkbox-multi]");

if (checkboxMulti) {
    const inputCheckAll = checkboxMulti.querySelector("input[name='checkall']");
    const listInputsId = checkboxMulti.querySelectorAll("input[name='id']");

    inputCheckAll.addEventListener("click", () => {
        if (inputCheckAll.checked) {
            listInputsId.forEach(input => {
                input.checked = true;
            })
        }
        else {
            listInputsId.forEach(input => {
                input.checked = false;
            })
        }
    });

    listInputsId.forEach(input => {
        input.addEventListener("click", () => {
            const countChecked = checkboxMulti.querySelectorAll("input[name='id']:checked").length;

            if (countChecked == listInputsId.length) {
                inputCheckAll.checked = true;
            }
            else {
                inputCheckAll.checked = false;
            }
        });
    })

}
// End Check box multi

// Form change multi
const formChangeMulti = document.querySelector("[form-change-multi]");

if (formChangeMulti) {
    formChangeMulti.addEventListener("submit", (e) => {
        e.preventDefault();
        const checkboxMulti = document.querySelector("[checkbox-multi]");
        const listInputsChecked = checkboxMulti.querySelectorAll("input[name='id']:checked");
        const typeChange = e.target.elements.type.value;

        if (!typeChange) {
            return;
        }

        if (listInputsChecked.length > 0) {
            let listIds = [];
            const inputIds = formChangeMulti.querySelector("input[name='ids']");

            listInputsChecked.forEach(input => {
                const id = input.value;

                listIds.push(id);
            })

            inputIds.value = listIds.join(", ");
            formChangeMulti.submit();
        }
    });
}
// End Form change multi

// Button change status 
const buttonsChangeStatus = document.querySelectorAll("[button-change-status]");

if (buttonsChangeStatus.length > 0) {
    const formChangeStatus = document.querySelector("#form-change-status");
    const path = formChangeStatus.getAttribute("data-path");

    buttonsChangeStatus.forEach(button => {
        button.addEventListener("click", () => {
            const currentStatus = button.getAttribute("data-status");
            const id = button.getAttribute("data-id");

            let changeStatus = (currentStatus == "active") ? "inactive" : "active";
            const action = path + `/${changeStatus}/${id}?_method=PATCH`;

            formChangeStatus.action = action;
            formChangeStatus.submit();
        })
    })
}
// End Button change status 

// Form delete item
const buttonsDelete = document.querySelectorAll("[button-delete]");

if (buttonsDelete.length > 0) {
    const formDeleteItem = document.querySelector("#form-delete-item");
    const path = formDeleteItem.getAttribute("data-path");

    buttonsDelete.forEach(button => {
        button.addEventListener("click", () => {
            const id = button.getAttribute("data-id");
            const action = path + `/${id}?_method=DELETE`;

            formDeleteItem.action = action;
            formDeleteItem.submit();
        })
    })
}
// End Form delete item

// Pagination
const buttonsPagination = document.querySelectorAll('[button-pagination]');

if (buttonsPagination.length > 0) {
    let url = new URL(window.location.href);

    buttonsPagination.forEach(button => {
        button.addEventListener("click", () => {
            const page = button.getAttribute("button-pagination");
            
            url.searchParams.set("page", page);
            window.location.href = url;
        })
    })
}
// End Pagination

// Sort
const sort = document.querySelector("[sort]");

if (sort) {
    const sortSelect = sort.querySelector("[sort-select]");
    const sortClear = sort.querySelector("[sort-clear]");
    let url = new URL(window.location.href);

    sortSelect.addEventListener("change", (e) => {
        const value = e.target.value;
        const [sortKey, sortValue] = value.split("-");

        url.searchParams.set("sortKey", sortKey);
        url.searchParams.set("sortValue", sortValue);

        window.location.href = url;
    });

    sortClear.addEventListener("click", () => {
        url.searchParams.delete("sortKey");
        url.searchParams.delete("sortValue");

        window.location.href = url;
    });

    // Get current sort from URL
    const currentSortKey = url.searchParams.get("sortKey");
    const currentSortValue = url.searchParams.get("sortValue");

    if (currentSortKey && currentSortValue) {
        const stringSort = `${currentSortKey}-${currentSortValue}`;
        const optionSelected = sortSelect.querySelector(`option[value='${stringSort}']`);

        optionSelected.selected = true;
    }
}
// End Sort



