export type LensOption = "5x" | "10x" | "20x" | "custom";
export type MediumOption = "air" | "custom";
export type LaserOption = "TOPS 1" | "TOPS 2" | "custom";

export const LENS_PRESETS: Record<
  Exclude<LensOption, "custom">,
  {
    w_rms: string;
    x_offset: string;
    lens_transmittance: string;
    detector_factor: string;
  }
> = {
  "5x": {
    w_rms: "11.20",
    x_offset: "12.60",
    lens_transmittance: "0.93",
    detector_factor: "74.0",
  },
  "10x": {
    w_rms: "5.60",
    x_offset: "6.30",
    lens_transmittance: "0.85",
    detector_factor: "37.0",
  },
  "20x": {
    w_rms: "2.825",
    x_offset: "3.15",
    lens_transmittance: "0.80",
    detector_factor: "18.5",
  },
};

export const MEDIUM_PRESETS: Record<
  Exclude<MediumOption, "custom">,
  {
    lambda_up: string;
    eta_up: string;
    c_up: string;
    h_up: string;
  }
> = {
  air: {
    lambda_up: "0.028",
    eta_up: "1.0",
    c_up: "1192.0",
    h_up: "0.001",
  },
};

export const LASER_PRESETS: Record<
  Exclude<LaserOption, "custom">,
  {
    f_rolloff: string;
    delay_1: string;
    delay_2: string;
    incident_pump: string;
    incident_probe: string;
  }
> = {
  "TOPS 1": {
    f_rolloff: "95000",
    delay_1: "0.0000089",
    delay_2: "-1.3e-11",
    incident_pump: "1.06",
    incident_probe: "0.85",
  },
  "TOPS 2": {
    f_rolloff: "95000",
    delay_1: "0.0000089",
    delay_2: "-1.3e-11",
    incident_pump: "1.06",
    incident_probe: "0.85",
  },
};
