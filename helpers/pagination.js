module.exports = (objectPagination, query, countStaffs) => {
    if (query.page) {
        objectPagination.currentPage = parseInt(query.page);
    }

    objectPagination.skip = (objectPagination.currentPage - 1) * objectPagination.limitItems;

    const totalPage = Math.ceil(countStaffs / objectPagination.limitItems);
    objectPagination.totalPage = totalPage;

    return objectPagination;
}