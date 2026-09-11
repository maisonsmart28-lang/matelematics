export type CameraAvlFamily = "icam" | "adas" | "dsm";
export type CameraAvlValueType = "unsigned" | "signed" | "ascii" | "hex";

export type CameraAvlDefinition = {
  id: number;
  name: string;
  family: CameraAvlFamily;
  bytes: number;
  type: CameraAvlValueType;
  unit: string | null;
  description: string;
  port?: "COM1" | "COM2" | null;
};

/**
 * Step 5C Teltonika camera/video AVL catalog.
 *
 * Scope:
 * - FMC650/FMM650 iCam camera state values documented in Cameras/Video.
 * - Teltonika ADAS AVL values for FMX6yy / FMC650 COM2 mapping.
 * - Teltonika DSM AVL values for FMC650 COM1 and COM2.
 *
 * Important: this catalog describes AVL metadata/events only. Photo/video
 * binary transfer uses a separate camera/media server protocol and is not
 * represented by these definitions.
 */
export const CAMERA_AVL_DEFINITIONS: readonly CameraAvlDefinition[] = [
  { id: 12301, name: "iCam DualCam1 Front State", family: "icam", bytes: 1, type: "unsigned", unit: null, description: "Camera/card state 0..4" },
  { id: 12302, name: "iCam DualCam1 Rear State", family: "icam", bytes: 1, type: "unsigned", unit: null, description: "Camera/card state 0..4" },
  { id: 12303, name: "iCam DashCam1 State", family: "icam", bytes: 1, type: "unsigned", unit: null, description: "Camera/card state 0..4" },
  { id: 12304, name: "iCam DualCam2 Front State", family: "icam", bytes: 1, type: "unsigned", unit: null, description: "Camera/card state 0..4" },
  { id: 12305, name: "iCam DualCam2 Rear State", family: "icam", bytes: 1, type: "unsigned", unit: null, description: "Camera/card state 0..4" },
  { id: 12306, name: "iCam DashCam2 State", family: "icam", bytes: 1, type: "unsigned", unit: null, description: "Camera/card state 0..4" },

  { id: 600, name: "ADAS Speed", family: "adas", bytes: 1, type: "unsigned", unit: "km/h", description: "Speed taken from ADAS" },
  { id: 601, name: "ADAS Left Turn Signal", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "0 off, 1 on" },
  { id: 602, name: "ADAS Right Turn Signal", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "0 off, 1 on" },
  { id: 603, name: "ADAS Brake Signal", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "0 off, 1 on" },
  { id: 604, name: "ADAS RPM", family: "adas", bytes: 2, type: "unsigned", unit: "rpm", description: "RPM taken from ADAS" },
  { id: 605, name: "ADAS LDW Left", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "Lane departure warning left state" },
  { id: 606, name: "ADAS LDW Right", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "Lane departure warning right state" },
  { id: 607, name: "ADAS Distance Left", family: "adas", bytes: 1, type: "unsigned", unit: "cm", description: "Distance to left lane line" },
  { id: 608, name: "ADAS Distance Right", family: "adas", bytes: 1, type: "unsigned", unit: "cm", description: "Distance to right lane line" },
  { id: 609, name: "ADAS Time Till Collision", family: "adas", bytes: 1, type: "unsigned", unit: "0.1 s", description: "Time until collision" },
  { id: 610, name: "ADAS SDA", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "Safety distance alert state" },
  { id: 611, name: "ADAS FVSA", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "Front vehicle start alarm state" },
  { id: 612, name: "ADAS FPW", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "Front proximity warning state" },
  { id: 613, name: "ADAS FCW", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "Front collision warning state" },
  { id: 614, name: "ADAS PCW", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "Pedestrian collision warning state" },
  { id: 615, name: "ADAS Record", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "Recording state" },
  { id: 616, name: "ADAS Error Code", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "0 none, 1 low visibility, 2 camera blocked" },
  { id: 617, name: "ADAS Ahead Distance", family: "adas", bytes: 1, type: "unsigned", unit: "m", description: "Distance to object ahead" },
  { id: 618, name: "ADAS Ahead Speed", family: "adas", bytes: 1, type: "signed", unit: "km/h", description: "Relative speed of object ahead" },
  { id: 619, name: "ADAS SLR State", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "Speed limit recognition state" },
  { id: 620, name: "ADAS SLR Recognize", family: "adas", bytes: 1, type: "unsigned", unit: "km/h", description: "Recognized speed limit" },
  { id: 621, name: "ADAS SLR Sensitivity", family: "adas", bytes: 1, type: "unsigned", unit: "%", description: "Speed limit recognition sensitivity" },
  { id: 665, name: "ADAS SD Card Status", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "ADAS camera SD card state" },
  { id: 666, name: "ADAS Camera State", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "MDAS9 camera state" },

  { id: 12944, name: "ADAS Speed", family: "adas", bytes: 1, type: "unsigned", unit: "km/h", description: "FMC650 COM2 ADAS speed", port: "COM2" },
  { id: 12945, name: "ADAS Left Turn Signal", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "FMC650 COM2 left turn signal", port: "COM2" },
  { id: 12946, name: "ADAS Right Turn Signal", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "FMC650 COM2 right turn signal", port: "COM2" },
  { id: 12947, name: "ADAS Brake Signal", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "FMC650 COM2 brake signal", port: "COM2" },
  { id: 12948, name: "ADAS RPM", family: "adas", bytes: 2, type: "unsigned", unit: "rpm", description: "FMC650 COM2 RPM", port: "COM2" },
  { id: 12949, name: "ADAS LDW Left", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "FMC650 COM2 LDW left", port: "COM2" },
  { id: 12950, name: "ADAS LDW Right", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "FMC650 COM2 LDW right", port: "COM2" },
  { id: 12951, name: "ADAS Distance Left", family: "adas", bytes: 1, type: "unsigned", unit: "cm", description: "FMC650 COM2 distance left", port: "COM2" },
  { id: 12952, name: "ADAS Distance Right", family: "adas", bytes: 1, type: "unsigned", unit: "cm", description: "FMC650 COM2 distance right", port: "COM2" },
  { id: 12953, name: "ADAS Time Till Collision", family: "adas", bytes: 1, type: "unsigned", unit: "0.1 s", description: "FMC650 COM2 time till collision", port: "COM2" },
  { id: 12954, name: "ADAS SDA", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "FMC650 COM2 SDA", port: "COM2" },
  { id: 12955, name: "ADAS FVSA", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "FMC650 COM2 FVSA", port: "COM2" },
  { id: 12956, name: "ADAS FPW", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "FMC650 COM2 FPW", port: "COM2" },
  { id: 12957, name: "ADAS FCW", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "FMC650 COM2 FCW", port: "COM2" },
  { id: 12958, name: "ADAS PCW", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "FMC650 COM2 PCW", port: "COM2" },
  { id: 12959, name: "ADAS Record", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "FMC650 COM2 recording state", port: "COM2" },
  { id: 12960, name: "ADAS Error Code", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "FMC650 COM2 error code", port: "COM2" },
  { id: 12961, name: "ADAS Ahead Distance", family: "adas", bytes: 1, type: "unsigned", unit: "m", description: "FMC650 COM2 ahead distance", port: "COM2" },
  { id: 12962, name: "ADAS Ahead Speed", family: "adas", bytes: 1, type: "signed", unit: "km/h", description: "FMC650 COM2 ahead relative speed", port: "COM2" },
  { id: 12963, name: "ADAS SLR State", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "FMC650 COM2 SLR state", port: "COM2" },
  { id: 12964, name: "ADAS SLR Recognize", family: "adas", bytes: 1, type: "unsigned", unit: "km/h", description: "FMC650 COM2 recognized speed limit", port: "COM2" },
  { id: 12965, name: "ADAS SLR Sensitivity", family: "adas", bytes: 1, type: "unsigned", unit: "%", description: "FMC650 COM2 SLR sensitivity", port: "COM2" },
  { id: 12966, name: "ADAS SD Card Status", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "FMC650 COM2 SD card status", port: "COM2" },
  { id: 12967, name: "ADAS Camera State", family: "adas", bytes: 1, type: "unsigned", unit: null, description: "FMC650 COM2 camera state", port: "COM2" },

  ...Array.from({ length: 15 }, (_, index): CameraAvlDefinition => {
    const names = [
      "DSM Drowsiness Event",
      "DSM Distraction Event",
      "DSM Yawning Event",
      "DSM Phone Event",
      "DSM Smoking Event",
      "DSM Driver Absence Event",
      "DSM Mask Event",
      "DSM G-Sensor Event",
      "DSM Active Driver Name",
      "DSM Recording Status",
      "DSM GPS Status",
      "DSM Speed",
      "DSM Error Code",
      "DSM Seatbelt Detection",
      "DSM State",
    ];
    const types: CameraAvlValueType[] = [
      "unsigned", "unsigned", "unsigned", "unsigned", "unsigned",
      "unsigned", "unsigned", "unsigned", "ascii", "unsigned",
      "unsigned", "unsigned", "hex", "unsigned", "unsigned",
    ];
    const bytes = index === 8 ? 10 : 1;
    return {
      id: 11700 + index,
      name: names[index],
      family: "dsm",
      bytes,
      type: types[index],
      unit: index === 11 ? "km/h" : null,
      description: `FMC650 DSM COM1 ${names[index]}`,
      port: "COM1",
    };
  }),

  ...Array.from({ length: 15 }, (_, index): CameraAvlDefinition => {
    const names = [
      "DSM Drowsiness Event",
      "DSM Distraction Event",
      "DSM Yawning Event",
      "DSM Phone Event",
      "DSM Smoking Event",
      "DSM Driver Absence Event",
      "DSM Mask Event",
      "DSM G-Sensor Event",
      "DSM Active Driver Name",
      "DSM Recording Status",
      "DSM GPS Status",
      "DSM Speed",
      "DSM Error Code",
      "DSM Seatbelt Detection",
      "DSM State",
    ];
    const types: CameraAvlValueType[] = [
      "unsigned", "unsigned", "unsigned", "unsigned", "unsigned",
      "unsigned", "unsigned", "unsigned", "ascii", "unsigned",
      "unsigned", "unsigned", "hex", "unsigned", "unsigned",
    ];
    const bytes = index === 8 ? 10 : 1;
    return {
      id: 12923 + index,
      name: names[index],
      family: "dsm",
      bytes,
      type: types[index],
      unit: index === 11 ? "km/h" : null,
      description: `FMC650 DSM COM2 ${names[index]}`,
      port: "COM2",
    };
  }),
];

const byId = new Map(CAMERA_AVL_DEFINITIONS.map((definition) => [definition.id, definition]));

export function getCameraAvlDefinition(id: number): CameraAvlDefinition | null {
  return byId.get(id) ?? null;
}
