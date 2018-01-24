﻿const DysonLinkDevice = require("./DysonLinkDevice").DysonLinkDevice;

var Accessory, Service, Characteristic;

function setHomebridge(homebridge) {
    // Accessory must be created from PlatformAccessory Constructor
    Accessory = homebridge.platformAccessory;

    // Service and Characteristic are from hap-nodejs
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
}

class DysonLinkAccessory {
    constructor(displayName, device, accessory, log) {


        this.device = device;
        this.accessory = accessory;
        this.log = log;
        this.displayName = displayName;

        this.initSensor();
        this.initFanState();
    }

    updateFanState() {
        this.fan.getCharacteristic(Characteristic.On).updateValue(this.device.fanState.fanOn);
        this.rotateSwitch.getCharacteristic(Characteristic.On).updateValue(this.device.fanState.fanRotate);
        this.autoSwitch.getCharacteristic(Characteristic.On).updateValue(this.device.fanState.fanAuto);
        this.nightModeSwitch.getCharacteristic(Characteristic.On).updateValue(this.device.fanState.nightMode);

        if (this.device.heatAvailable) {
            this.heatSwitch.getCharacteristic(Characteristic.On).updateValue(this.device.fanState.fanHeat);
        }
    }

    initSensor() {
        this.log("Init Sensor for " + this.displayName);
        this.temperatureSensor = this.getService(Service.TemperatureSensor);
        this.temperatureSensor
            .getCharacteristic(Characteristic.CurrentTemperature)
            .setProps({ minValue: -50, maxValue: 100, unit: "celsius" })
            .on("get", this.device.getTemperture.bind(this.device));

        this.humiditySensor = this.getService(Service.HumiditySensor);
        this.humiditySensor
            .getCharacteristic(Characteristic.CurrentRelativeHumidity)
            .setProps({ minValue: 0, maxValue: 100 })
            .on("get", this.device.getHumidity.bind(this.device));

        this.airSensor = this.getService(Service.AirQualitySensor);
        this.airSensor
            .getCharacteristic(Characteristic.AirQuality)
            .on("get", this.device.getAirQuality.bind(this.device));
    }

    initFanState() {
        this.log("Init Fan State for " + this.displayName);

        // Remove Fan V1 and rotate switch if it exists
        var fanV1 = this.accessory.getService(Service.Fan);
        if (fanV1) {
            this.log("fan v1 found. Remove this now");
            this.accessory.removeService(fanV1);
        }
        var rotateSwitch = this.getServiceBySubtype(Service.Switch, "Rotation - " + this.displayName, "Rotate");
        if(rotateSwitch) {
            this.log("Rotate switch found. Remove this now");
            this.accessory.removeService(rotateSwitch);
        }
        // var autoSwitch = this.getServiceBySubtype(Service.Switch, "Auto - " + this.displayName, "Auto");
        // if(autoSwitch) {
        //     this.log("Auto switch found. Remove this now");
        //     this.accessory.removeService(autoSwitch);
        // }

        this.fan = this.getService(Service.Fanv2); 

        this.fan.getCharacteristic(Characteristic.Active)
            .on("get", this.device.isFanOn.bind(this.device))
            .on("set", this.device.setFanOn.bind(this.device));            
        
        this.fan.getCharacteristic(Characteristic.TargetFanState)
            .on("get", this.device.isFanAuto.bind(this.device))
            .on("set", this.device.setFanAuto.bind(this.device));
        //this.autoSwitch = this.getServiceBySubtype(Service.Switch, "Auto - " + this.displayName, "Auto");
        //
        //this.autoSwitch
        //    .getCharacteristic(Characteristic.On)
        //    .on("get", this.device.isFanAuto.bind(this.device))
        //    .on("set", this.device.setFanAuto.bind(this.device));

        // This is actually the fan speed instead of rotation speed but homekit fan does not support this
        this.fan.getCharacteristic(Characteristic.RotationSpeed)
            .on("get", this.device.getFanSpeed.bind(this.device))
            .on("set", this.device.setFanSpeed.bind(this.device));
        
        this.fan.getCharacteristic(Characteristic.SwingMode)
            .on("get", this.device.isRotate.bind(this.device))
            .on("set", this.device.setRotate.bind(this.device));
        
        //Trying MUTE Characteristic??
        this.fan.addCharacteristic(Characteristic.Mute)
        //NIGHT VISION Characteristic works in Elgato EVE app but not iOS HOME app.
        //this.fan.addCharacteristic(Characteristic.NightVision)
        //
        //Removed Switch Service
        //this.nightModeSwitch = this.getServiceBySubtype(Service.Switch, "Night Mode - " + this.displayName, "Night Mode");
        //this.nightModeSwitch
        //    .getCharacteristic(Characteristic.On)
            .on("get", this.device.isNightMode.bind(this.device))
            .on("set", this.device.setNightMode.bind(this.device));


        // Set Heat 
        if (this.device.heatAvailable) {
            //this.log("Heat Available. Add Heat button and jet control");
            //this.heatSwitch = this.getServiceBySubtype(Service.Switch, "Heat - " + this.displayName, "Heat");
            //this.heatSwitch
            //    .getCharacteristic(Characteristic.On)
            //Trying HeatingCoolingState instead of heatSwitch
            // The value property of CurrentHeatingCoolingState must be one of the following:
            //Characteristic.CurrentHeatingCoolingState.OFF = 0;
            //Characteristic.CurrentHeatingCoolingState.HEAT = 1;
            //Characteristic.CurrentHeatingCoolingState.COOL = 2;
            this.fan.addCharacteristic(Characteristic.HeatingCoolingState)
                .on("get", this.device.isHeatOn.bind(this.device))
                .on("set", this.device.setHeatOn.bind(this.device));

            this.focusSwitch = this.getServiceBySubtype(Service.Switch, "Jet Focus - " + this.displayName, "Jet Focus");

            this.focusSwitch
                .getCharacteristic(Characteristic.On)
                .on("get", this.device.isFocusedJet.bind(this.device))
                .on("set", this.device.setFocusedJet.bind(this.device));
        }

        // this.device.mqttEvent.on(this.device.STATE_EVENT, () => {
        //     this.log(this.displayName + " - Fan State changed. Update the UI on Home app");
        //     this.fan.getCharacteristic(Characteristic.On).updateValue(this.device.fanState.fanOn);
        //     this.rotateSwitch.getCharacteristic(Characteristic.On).updateValue(this.device.fanState.fanRotate);
        //     this.autoSwitch.getCharacteristic(Characteristic.On).updateValue(this.device.fanState.fanAuto);
        //     this.nightModeSwitch.getCharacteristic(Characteristic.On).updateValue(this.device.fanState.nightMode);

        //     if (this.device.heatAvailable) {
        //         this.heatSwitch.getCharacteristic(Characteristic.On).updateValue(this.device.fanState.fanHeat);
        //     }
        // });
    }

    getService(serviceType) {
        let service = this.accessory.getService(serviceType);
        if (!service) {
            service = this.accessory.addService(serviceType, this.displayName);
        }
        return service;
    }

    getServiceBySubtype(serviceType, displayName, subType) {
        let service = this.accessory.getServiceByUUIDAndSubType(serviceType, subType);
        if (!service) {
            service = this.accessory.addService(serviceType, displayName, subType);
        }

        return service;
    }

}


module.exports = {
    DysonLinkAccessory, setHomebridge
}
