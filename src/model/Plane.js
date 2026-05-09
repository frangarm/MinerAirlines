export class Plane{
    /**
     * Represents a plane, which is used in the Flight class. Contains information about the plane's capacity, manufacturer, model, plane ID, and name.
     * @param {number} capacity The plane's capacity
     * @param {string} manufacturer The plane's manufacturer
     * @param {string} model The planes model
     */
    constructor(capacity, manufacturer, model){
        this.capacity = capacity;
        this.manufacturer = manufacturer;
        this.model = model;
        this.planeId = crypto.randomUUID();
        this.name = manufacturer.slice(0,3).toUpperCase() + model+ this.planeId.slice(0,4);
    }
}