const transformName = (name) => {

    if (typeof name !== "string") {
        throw new Error("String must be provided");
    }

    return name[0].toUpperCase() + name.slice(1).toLowerCase();
}

module.exports = transformName;