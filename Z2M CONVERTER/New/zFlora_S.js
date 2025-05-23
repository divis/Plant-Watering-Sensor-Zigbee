const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

const tzLocal = {
    node_config: {
        key: ['report_delay'],
        convertSet: async (entity, key, rawValue, meta) => {
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads = {
                report_delay: ['genPowerCfg', {0x0201: {value, type: 0x21}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
	node_debug: {
        key: ['lower_level', 'upper_level'],
        convertSet: async (entity, key, rawValue, meta) => {
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads = {
                lower_level: ['genBasic', {0x0502: {value, type: 0x21}}],
				upper_level: ['genBasic', {0x0503: {value, type: 0x21}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
	temperaturef_config: {
        key: ['temperature_offset'],
        convertSet: async (entity, key, rawValue, meta) => {
            const value = parseFloat(rawValue)*10;
            const payloads = {
                temperature_offset: ['msTemperatureMeasurement', {0x0410: {value, type: 0x29}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
};

const fzLocal = {
    node_config: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(0x0201)) {
                result.report_delay = msg.data[0x0201];
            }
            return result;
        },
    },
	node_debug: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
			if (msg.data.hasOwnProperty(0x0500)) {
                result.bat_adc = msg.data[0x0500];
            }
            if (msg.data.hasOwnProperty(0x0499)) {
                result.sm_adc_compens = msg.data[0x0499];
            }
			if (msg.data.hasOwnProperty(0x0501)) {
                result.sm_adc = msg.data[0x0501];
            }
			if (msg.data.hasOwnProperty(0x0502)) {
                result.lower_level = msg.data[0x0502];
            }
			if (msg.data.hasOwnProperty(0x0503)) {
                result.upper_level = msg.data[0x0503];
            }
            return result;
        },
    },
	temperaturef_config: {
        cluster: 'msTemperatureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(0x0410)) {
                result.temperature_offset = parseFloat(msg.data[0x0410])/10.0;
            }
            return result;
        },
    },
};

const definition = {
        zigbeeModel: ['zFlora_S'],
        model: 'zFlora_S',
        vendor: 'Custom devices (DiY)',
        description: '[Plant watering sensor zFlora S Max](http://efektalab.com/PWS)',
        fromZigbee: [fz.temperature, fz.humidity, fz.soil_moisture, fz.battery, fzLocal.node_config, fzLocal.temperaturef_config, fzLocal.node_debug],
        toZigbee: [tz.factory_reset, tzLocal.node_config, tzLocal.temperaturef_config, tzLocal.node_debug],
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, [
                'genBasic', 'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msSoilMoisture']);
        },
        exposes: [e.soil_moisture(), e.battery(), e.battery_low(), e.battery_voltage(), e.temperature(), e.humidity(),
		    exposes.numeric('report_delay', ea.STATE_SET).withUnit('Minutes').withDescription('Adjust Report Delay. Setting the time in minutes, by default 30 minutes')
                .withValueMin(1).withValueMax(360),
			exposes.numeric('lower_level', ea.STATE_SET).withUnit('%').withDescription('The lower level of soil moisture 0% is:')
                .withValueMin(0).withValueMax(99),
			exposes.numeric('upper_level', ea.STATE_SET).withUnit('%').withDescription('The upper level of soil moisture 100% is:')
                .withValueMin(1).withValueMax(100),
		    exposes.numeric('temperature_offset', ea.STATE_SET).withUnit('°C').withValueStep(0.1).withDescription('Adjust temperature')
                .withValueMin(-50.0).withValueMax(50.0)],
};

module.exports = definition;
