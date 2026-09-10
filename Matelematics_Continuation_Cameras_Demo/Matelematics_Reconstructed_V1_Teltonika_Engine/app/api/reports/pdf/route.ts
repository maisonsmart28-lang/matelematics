import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";


export const runtime = "nodejs";


type Role =
  | "matelematics_admin"
  | "partner_admin"
  | "client_admin"
  | "user";

function isRole(
  value: unknown,
): value is Role {
  return (
    value === "matelematics_admin" ||
    value === "partner_admin" ||
    value === "client_admin" ||
    value === "user"
  );
}


type Profile = {
  id: string;
  full_name: string | null;
  role: Role;
  company_id: string | null;
  partner_id: string | null;
};


type Vehicle = {
  id: string;
  company_id: string;
  name: string;
  registration: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  device_id: string | null;
  status: string;
};


type Position = {
  vehicle_id: string;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
};


type AlertRow = {
  id: string;
  vehicle_id: string | null;
  alert_type: string;
  severity: string | null;
  title: string;
  message: string | null;
  triggered_at: string;
  resolved_at: string | null;
  status: string;
};


type TelemetryRow = {
  vehicle_id: string;
  recorded_at: string;
  signal_strength: number | null;
  battery_voltage: number | null;
  ignition: boolean | null;
};


const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const secretKey =
  process.env.SUPABASE_SECRET_KEY;


function adminClient() {
  if (
    !supabaseUrl ||
    !secretKey
  ) {
    throw new Error(
      "Configuration Supabase serveur absente."
    );
  }

  return createClient(
    supabaseUrl,
    secretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}


async function authenticate(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      "authorization"
    );

  const token =
    authorization?.startsWith(
      "Bearer "
    )
      ? authorization.slice(7)
      : null;

  if (!token) {
    throw new Error(
      "AUTH_REQUIRED"
    );
  }

  const admin =
    adminClient();

  const {
    data: userData,
    error: userError,
  } =
    await admin.auth.getUser(
      token
    );

  if (
    userError ||
    !userData.user
  ) {
    throw new Error(
      "AUTH_REQUIRED"
    );
  }

  const {
    data: profile,
    error: profileError,
  } =
    await admin
      .from("profiles")
      .select(
        "id,full_name,role,company_id,partner_id"
      )
      .eq(
        "id",
        userData.user.id
      )
      .single();

  if (
    profileError ||
    !profile
  ) {
    throw new Error(
      "PROFILE_REQUIRED"
    );
  }

  if (!isRole(profile.role)) {
    throw new Error("FORBIDDEN");
  }

  return {
    admin,
    profile:
      profile as Profile,
  };
}


async function visibleVehicles(
  admin:
    ReturnType<
      typeof adminClient
    >,
  profile: Profile
) {
  let companyIds:
    string[] | null =
    null;

  if (
    profile.role ===
    "partner_admin"
  ) {
    if (!profile.partner_id) {
      return [];
    }

    const {
      data: companies,
      error,
    } =
      await admin
        .from("companies")
        .select("id")
        .eq(
          "partner_id",
          profile.partner_id
        );

    if (error) {
      throw error;
    }

    companyIds =
      (companies ?? []).map(
        (company) =>
          company.id
      );

    if (
      companyIds.length === 0
    ) {
      return [];
    }
  }


  let query =
    admin
      .from("vehicles")
      .select(
        "id,company_id,name,registration,brand,model,year,device_id,status"
      )
      .order("name");


  if (
    profile.role ===
      "client_admin" ||
    profile.role ===
      "user"
  ) {
    if (!profile.company_id) {
      return [];
    }

    query =
      query.eq(
        "company_id",
        profile.company_id
      );
  }


  if (
    profile.role ===
      "partner_admin" &&
    companyIds
  ) {
    query =
      query.in(
        "company_id",
        companyIds
      );
  }


  const {
    data,
    error,
  } =
    await query;

  if (error) {
    throw error;
  }

  return (
    data ?? []
  ) as Vehicle[];
}


export async function GET(
  request: NextRequest
) {
  try {
    const {
      admin,
      profile,
    } =
      await authenticate(
        request
      );

    const vehicles =
      await visibleVehicles(
        admin,
        profile
      );

    return NextResponse.json({
      vehicles,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur.";

    const status =
      message ===
        "AUTH_REQUIRED"
        ? 401
        : message ===
            "PROFILE_REQUIRED" ||
          message ===
            "FORBIDDEN"
          ? 403
          : 500;

    return NextResponse.json(
      {
        error:
          message ===
          "AUTH_REQUIRED"
            ? "Authentification requise."
            : message ===
                "PROFILE_REQUIRED"
              ? "Profil utilisateur introuvable."
              : message ===
                  "FORBIDDEN"
                ? "Acces refuse."
                : message,
      },
      {
        status,
      }
    );
  }
}


function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const radius =
    6371;

  const toRad =
    (value: number) =>
      value *
      Math.PI /
      180;

  const dLat =
    toRad(
      lat2 - lat1
    );

  const dLon =
    toRad(
      lon2 - lon1
    );

  const a =
    Math.sin(
      dLat / 2
    ) ** 2 +
    Math.cos(
      toRad(lat1)
    ) *
      Math.cos(
        toRad(lat2)
      ) *
      Math.sin(
        dLon / 2
      ) ** 2;

  return (
    radius *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}


function cleanText(
  value:
    string | number | null | undefined
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  return String(value)
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2192/g, "->");
}


function formatDate(
  value:
    string | null | undefined
) {
  if (!value) {
    return "-";
  }

  try {
    return new Date(
      value
    ).toLocaleString(
      "fr-FR",
      {
        timeZone: "Africa/Casablanca",
      }
    );
  } catch {
    return value;
  }
}


function fitText(
  text: string,
  font: PDFFont,
  size: number,
  width: number
) {
  const source =
    cleanText(text);

  if (
    font.widthOfTextAtSize(
      source,
      size
    ) <= width
  ) {
    return source;
  }

  let result =
    source;

  while (
    result.length > 1 &&
    font.widthOfTextAtSize(
      `${result}...`,
      size
    ) > width
  ) {
    result =
      result.slice(
        0,
        -1
      );
  }

  return `${result}...`;
}


type PdfContext = {
  doc: PDFDocument;
  page: PDFPage;
  regular: PDFFont;
  bold: PDFFont;
  y: number;
};


function addPage(
  ctx: PdfContext
) {
  ctx.page =
    ctx.doc.addPage([
      595.28,
      841.89,
    ]);

  ctx.y =
    800;

  ctx.page.drawText(
    "Matelematics",
    {
      x: 40,
      y: ctx.y,
      size: 15,
      font: ctx.bold,
      color:
        rgb(
          0.10,
          0.35,
          0.78
        ),
    }
  );

  ctx.page.drawText(
    "Rapport telematique",
    {
      x: 430,
      y: ctx.y + 1,
      size: 8,
      font: ctx.regular,
      color:
        rgb(
          0.4,
          0.4,
          0.45
        ),
    }
  );

  ctx.y -=
    28;

  ctx.page.drawLine({
    start: {
      x: 40,
      y: ctx.y,
    },
    end: {
      x: 555,
      y: ctx.y,
    },
    thickness: 1,
    color:
      rgb(
        0.84,
        0.86,
        0.90
      ),
  });

  ctx.y -=
    22;
}


function ensureSpace(
  ctx: PdfContext,
  height: number
) {
  if (
    ctx.y - height <
    45
  ) {
    addPage(ctx);
  }
}


function sectionTitle(
  ctx: PdfContext,
  title: string
) {
  ensureSpace(
    ctx,
    38
  );

  ctx.page.drawText(
    title,
    {
      x: 40,
      y: ctx.y,
      size: 13,
      font: ctx.bold,
      color:
        rgb(
          0.10,
          0.16,
          0.25
        ),
    }
  );

  ctx.y -=
    24;
}


function textLine(
  ctx: PdfContext,
  label: string,
  value: string
) {
  ensureSpace(
    ctx,
    18
  );

  ctx.page.drawText(
    label,
    {
      x: 40,
      y: ctx.y,
      size: 9,
      font: ctx.bold,
      color:
        rgb(
          0.25,
          0.28,
          0.33
        ),
    }
  );

  ctx.page.drawText(
    cleanText(value),
    {
      x: 150,
      y: ctx.y,
      size: 9,
      font: ctx.regular,
      color:
        rgb(
          0.16,
          0.18,
          0.22
        ),
    }
  );

  ctx.y -=
    16;
}


function table(
  ctx: PdfContext,
  headers: string[],
  rows: string[][],
  widths: number[]
) {
  const rowHeight =
    21;

  const drawHeader =
    () => {
      ensureSpace(
        ctx,
        rowHeight * 2
      );

      let x =
        40;

      ctx.page.drawRectangle({
        x: 40,
        y:
          ctx.y -
          4,
        width: 515,
        height: rowHeight,
        color:
          rgb(
            0.94,
            0.96,
            0.98
          ),
      });

      headers.forEach(
        (
          header,
          index
        ) => {
          ctx.page.drawText(
            fitText(
              header,
              ctx.bold,
              7.5,
              widths[index] - 8
            ),
            {
              x:
                x + 4,
              y:
                ctx.y + 3,
              size: 7.5,
              font: ctx.bold,
              color:
                rgb(
                  0.2,
                  0.24,
                  0.3
                ),
            }
          );

          x +=
            widths[index];
        }
      );

      ctx.y -=
        rowHeight;
    };


  drawHeader();


  for (
    const row of rows
  ) {
    if (
      ctx.y -
        rowHeight <
      45
    ) {
      addPage(ctx);
      drawHeader();
    }

    let x =
      40;

    row.forEach(
      (
        cell,
        index
      ) => {
        ctx.page.drawText(
          fitText(
            cleanText(cell),
            ctx.regular,
            7.2,
            widths[index] - 8
          ),
          {
            x:
              x + 4,
            y:
              ctx.y + 3,
            size: 7.2,
            font: ctx.regular,
            color:
              rgb(
                0.18,
                0.20,
                0.24
              ),
          }
        );

        x +=
          widths[index];
      }
    );

    ctx.page.drawLine({
      start: {
        x: 40,
        y:
          ctx.y -
          4,
      },
      end: {
        x: 555,
        y:
          ctx.y -
          4,
      },
      thickness: 0.35,
      color:
        rgb(
          0.88,
          0.89,
          0.91
        ),
    });

    ctx.y -=
      rowHeight;
  }
}


export async function POST(
  request: NextRequest
) {
  try {
    const {
      admin,
      profile,
    } =
      await authenticate(
        request
      );

    const body =
      await request.json();

    const reportType =
      String(
        body.reportType ??
        "fleet"
      );

    const selectedVehicle =
      String(
        body.vehicle ??
        "all"
      );

    const startDate =
      String(
        body.startDate ??
        ""
      );

    const endDate =
      String(
        body.endDate ??
        ""
      );


    if (
      ![
        "fleet",
        "trips",
        "fuel",
        "alerts",
      ].includes(
        reportType
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Type de rapport invalide.",
        },
        {
          status: 400,
        }
      );
    }


    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        startDate
      ) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(
        endDate
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Periode invalide.",
        },
        {
          status: 400,
        }
      );
    }


    const start =
      new Date(
        `${startDate}T00:00:00.000Z`
      );

    const end =
      new Date(
        `${endDate}T23:59:59.999Z`
      );


    if (
      start.getTime() >
      end.getTime()
    ) {
      return NextResponse.json(
        {
          error:
            "La date de debut doit preceder la date de fin.",
        },
        {
          status: 400,
        }
      );
    }


    const allVehicles =
      await visibleVehicles(
        admin,
        profile
      );


    let vehicles =
      allVehicles;


    if (
      selectedVehicle !==
      "all"
    ) {
      const allowed =
        allVehicles.find(
          (vehicle) =>
            vehicle.id ===
            selectedVehicle
        );

      if (!allowed) {
        return NextResponse.json(
          {
            error:
              "Vehicule hors de votre perimetre.",
          },
          {
            status: 403,
          }
        );
      }

      vehicles = [
        allowed,
      ];
    }


    const vehicleIds =
      vehicles.map(
        (vehicle) =>
          vehicle.id
      );


    const companyIds =
      Array.from(
        new Set(
          vehicles.map(
            (vehicle) =>
              vehicle.company_id
          )
        )
      );


    const companyNames =
      new Map<
        string,
        string
      >();


    if (
      companyIds.length >
      0
    ) {
      const {
        data: companies,
      } =
        await admin
          .from("companies")
          .select("id,name")
          .in(
            "id",
            companyIds
          );

      for (
        const company of
        companies ?? []
      ) {
        companyNames.set(
          company.id,
          company.name
        );
      }
    }


    let positions:
      Position[] =
      [];

    let alerts:
      AlertRow[] =
      [];

    let telemetry:
      TelemetryRow[] =
      [];


    if (
      vehicleIds.length >
        0 &&
      (
        reportType ===
          "fleet" ||
        reportType ===
          "trips"
      )
    ) {
      const {
        data,
        error,
      } =
        await admin
          .from("positions")
          .select(
            "vehicle_id,latitude,longitude,speed,heading,recorded_at"
          )
          .in(
            "vehicle_id",
            vehicleIds
          )
          .gte(
            "recorded_at",
            start.toISOString()
          )
          .lte(
            "recorded_at",
            end.toISOString()
          )
          .order(
            "recorded_at",
            {
              ascending: true,
            }
          )
          .limit(10000);

      if (error) {
        throw error;
      }

      positions =
        (data ??
          []) as Position[];
    }


    if (
      vehicleIds.length >
        0 &&
      (
        reportType ===
          "fleet" ||
        reportType ===
          "alerts"
      )
    ) {
      const {
        data,
        error,
      } =
        await admin
          .from("alerts")
          .select(
            "id,vehicle_id,alert_type,severity,title,message,triggered_at,resolved_at,status"
          )
          .in(
            "vehicle_id",
            vehicleIds
          )
          .gte(
            "triggered_at",
            start.toISOString()
          )
          .lte(
            "triggered_at",
            end.toISOString()
          )
          .order(
            "triggered_at",
            {
              ascending: false,
            }
          )
          .limit(5000);

      if (error) {
        throw error;
      }

      alerts =
        (data ??
          []) as AlertRow[];
    }


    if (
      vehicleIds.length >
        0 &&
      reportType ===
        "fuel"
    ) {
      const {
        data,
        error,
      } =
        await admin
          .from("telemetry")
          .select(
            "vehicle_id,recorded_at,signal_strength,battery_voltage,ignition"
          )
          .in(
            "vehicle_id",
            vehicleIds
          )
          .gte(
            "recorded_at",
            start.toISOString()
          )
          .lte(
            "recorded_at",
            end.toISOString()
          )
          .order(
            "recorded_at",
            {
              ascending: true,
            }
          )
          .limit(10000);

      if (error) {
        throw error;
      }

      telemetry =
        (data ??
          []) as TelemetryRow[];
    }


    const pdf =
      await PDFDocument.create();

    const regular =
      await pdf.embedFont(
        StandardFonts.Helvetica
      );

    const bold =
      await pdf.embedFont(
        StandardFonts.HelveticaBold
      );


    const ctx:
      PdfContext = {
        doc: pdf,
        page:
          undefined as unknown as PDFPage,
        regular,
        bold,
        y: 800,
      };


    addPage(ctx);

    ctx.page.drawText(
      reportType ===
        "fleet"
        ? "Rapport de flotte"
        : reportType ===
            "trips"
          ? "Rapport d'activite GPS"
          : reportType ===
              "fuel"
            ? "Rapport telemetrie / carburant"
            : "Rapport d'alertes",
      {
        x: 40,
        y: ctx.y,
        size: 22,
        font: bold,
        color:
          rgb(
            0.06,
            0.10,
            0.18
          ),
      }
    );

    ctx.y -=
      34;


    textLine(
      ctx,
      "Utilisateur",
      profile.full_name ??
      profile.id
    );

    textLine(
      ctx,
      "Role",
      profile.role
    );

    textLine(
      ctx,
      "Periode",
      `${startDate} - ${endDate}`
    );

    textLine(
      ctx,
      "Vehicules",
      selectedVehicle ===
        "all"
        ? `${vehicles.length} vehicule(s)`
        : vehicles[0]?.name ??
          "-"
    );

    textLine(
      ctx,
      "Genere le",
      new Date().toLocaleString(
        "fr-FR",
        {
          timeZone:
            "Africa/Casablanca",
        }
      )
    );

    ctx.y -=
      10;


    if (
      reportType ===
      "fleet"
    ) {
      sectionTitle(
        ctx,
        "Synthese"
      );

      textLine(
        ctx,
        "Vehicules",
        String(
          vehicles.length
        )
      );

      textLine(
        ctx,
        "GPS recus",
        String(
          positions.length
        )
      );

      textLine(
        ctx,
        "Alertes",
        String(
          alerts.length
        )
      );

      const speeds =
        positions
          .map(
            (position) =>
              position.speed
          )
          .filter(
            (
              speed
            ): speed is number =>
              typeof speed ===
              "number"
          );

      const avgSpeed =
        speeds.length
          ? speeds.reduce(
              (
                sum,
                speed
              ) =>
                sum +
                speed,
              0
            ) /
            speeds.length
          : 0;

      const maxSpeed =
        speeds.length
          ? Math.max(
              ...speeds
            )
          : 0;

      textLine(
        ctx,
        "Vitesse moyenne",
        `${avgSpeed.toFixed(
          1
        )} km/h`
      );

      textLine(
        ctx,
        "Vitesse maximale",
        `${maxSpeed.toFixed(
          1
        )} km/h`
      );


      sectionTitle(
        ctx,
        "Detail de la flotte"
      );


      const rows =
        vehicles.map(
          (vehicle) => {
            const vehiclePositions =
              positions.filter(
                (position) =>
                  position.vehicle_id ===
                  vehicle.id
              );

            const vehicleSpeeds =
              vehiclePositions
                .map(
                  (position) =>
                    position.speed
                )
                .filter(
                  (
                    speed
                  ): speed is number =>
                    typeof speed ===
                    "number"
                );

            const average =
              vehicleSpeeds.length
                ? vehicleSpeeds.reduce(
                    (
                      sum,
                      speed
                    ) =>
                      sum +
                      speed,
                    0
                  ) /
                  vehicleSpeeds.length
                : 0;

            const maximum =
              vehicleSpeeds.length
                ? Math.max(
                    ...vehicleSpeeds
                  )
                : 0;

            return [
              vehicle.name,
              vehicle.registration,
              companyNames.get(
                vehicle.company_id
              ) ?? "-",
              vehicle.status,
              average.toFixed(1),
              maximum.toFixed(1),
              String(
                vehiclePositions.length
              ),
            ];
          }
        );


      table(
        ctx,
        [
          "Vehicule",
          "Immat.",
          "Client",
          "Statut",
          "Moy.",
          "Max.",
          "GPS",
        ],
        rows,
        [
          105,
          72,
          100,
          68,
          50,
          50,
          45,
        ]
      );
    }


    if (
      reportType ===
      "trips"
    ) {
      sectionTitle(
        ctx,
        "Activite GPS par vehicule"
      );


      const rows =
        vehicles.map(
          (vehicle) => {
            const list =
              positions.filter(
                (position) =>
                  position.vehicle_id ===
                  vehicle.id
              );

            let distance =
              0;

            for (
              let index = 1;
              index <
              list.length;
              index++
            ) {
              const previous =
                list[index - 1];

              const current =
                list[index];

              if (
                previous.latitude !==
                  null &&
                previous.longitude !==
                  null &&
                current.latitude !==
                  null &&
                current.longitude !==
                  null
              ) {
                distance +=
                  haversineKm(
                    previous.latitude,
                    previous.longitude,
                    current.latitude,
                    current.longitude
                  );
              }
            }

            return [
              vehicle.name,
              vehicle.registration,
              distance.toFixed(2),
              String(
                list.length
              ),
              list.length
                ? formatDate(
                    list[0]
                      .recorded_at
                  )
                : "-",
              list.length
                ? formatDate(
                    list[
                      list.length -
                      1
                    ].recorded_at
                  )
                : "-",
            ];
          }
        );


      textLine(
        ctx,
        "Note",
        "Distance GPS calculee a partir des positions disponibles."
      );

      sectionTitle(
        ctx,
        "Detail"
      );

      table(
        ctx,
        [
          "Vehicule",
          "Immat.",
          "Km GPS",
          "Points",
          "Premiere position",
          "Derniere position",
        ],
        rows,
        [
          100,
          70,
          55,
          45,
          120,
          125,
        ]
      );
    }


    if (
      reportType ===
      "fuel"
    ) {
      sectionTitle(
        ctx,
        "Telemetrie disponible"
      );

      textLine(
        ctx,
        "Enregistrements",
        String(
          telemetry.length
        )
      );

      textLine(
        ctx,
        "Information",
        "Aucune colonne carburant dediee n'existe actuellement dans le schema."
      );

      textLine(
        ctx,
        "Suite",
        "Les donnees carburant pourront etre ajoutees depuis les IO/CAN Teltonika."
      );


      const rows =
        vehicles.map(
          (vehicle) => {
            const rows =
              telemetry.filter(
                (item) =>
                  item.vehicle_id ===
                  vehicle.id
              );

            const voltages =
              rows
                .map(
                  (item) =>
                    item.battery_voltage
                )
                .filter(
                  (
                    value
                  ): value is number =>
                    typeof value ===
                    "number"
                );

            const averageVoltage =
              voltages.length
                ? voltages.reduce(
                    (
                      sum,
                      value
                    ) =>
                      sum +
                      value,
                    0
                  ) /
                  voltages.length
                : null;

            return [
              vehicle.name,
              vehicle.registration,
              String(
                rows.length
              ),
              averageVoltage ===
              null
                ? "-"
                : averageVoltage.toFixed(
                    2
                  ),
              rows.length
                ? formatDate(
                    rows[
                      rows.length -
                      1
                    ].recorded_at
                  )
                : "-",
            ];
          }
        );


      sectionTitle(
        ctx,
        "Detail par vehicule"
      );

      table(
        ctx,
        [
          "Vehicule",
          "Immat.",
          "Telemetrie",
          "Batterie V",
          "Derniere donnee",
        ],
        rows,
        [
          120,
          80,
          70,
          75,
          170,
        ]
      );
    }


    if (
      reportType ===
      "alerts"
    ) {
      sectionTitle(
        ctx,
        "Synthese des alertes"
      );

      textLine(
        ctx,
        "Total",
        String(
          alerts.length
        )
      );

      const active =
        alerts.filter(
          (alert) =>
            alert.status ===
            "active"
        ).length;

      textLine(
        ctx,
        "Actives",
        String(active)
      );


      const vehicleMap =
        new Map(
          vehicles.map(
            (vehicle) => [
              vehicle.id,
              vehicle,
            ]
          )
        );


      sectionTitle(
        ctx,
        "Alertes"
      );


      const rows =
        alerts
          .slice(
            0,
            250
          )
          .map(
            (alert) => {
              const vehicle =
                alert.vehicle_id
                  ? vehicleMap.get(
                      alert.vehicle_id
                    )
                  : null;

              return [
                formatDate(
                  alert.triggered_at
                ),
                vehicle?.name ??
                  "-",
                alert.severity ??
                  "-",
                alert.title,
                alert.status,
              ];
            }
          );


      table(
        ctx,
        [
          "Date",
          "Vehicule",
          "Niveau",
          "Alerte",
          "Statut",
        ],
        rows,
        [
          110,
          100,
          65,
          170,
          70,
        ]
      );


      if (
        alerts.length >
        250
      ) {
        ctx.y -=
          8;

        textLine(
          ctx,
          "Note",
          "Le detail PDF est limite aux 250 alertes les plus recentes."
        );
      }
    }


    const pages =
      pdf.getPages();

    pages.forEach(
      (
        page,
        index
      ) => {
        page.drawText(
          `Matelematics - Page ${
            index + 1
          } / ${pages.length}`,
          {
            x: 40,
            y: 22,
            size: 7,
            font: regular,
            color:
              rgb(
                0.45,
                0.47,
                0.50
              ),
          }
        );
      }
    );


    const pdfBytes =
      await pdf.save();


    const typeName =
      reportType ===
        "fleet"
        ? "Flotte"
        : reportType ===
            "trips"
          ? "Activite_GPS"
          : reportType ===
              "fuel"
            ? "Telemetrie"
            : "Alertes";


    const filename =
      `Matelematics_Rapport_${typeName}_${startDate}_${endDate}.pdf`;


    return new NextResponse(
      Buffer.from(
        pdfBytes
      ),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${filename}"`,

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[Reports PDF]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Erreur serveur.";

    const status =
      message ===
        "AUTH_REQUIRED"
        ? 401
        : message ===
            "PROFILE_REQUIRED" ||
          message ===
            "FORBIDDEN"
          ? 403
          : 500;

    return NextResponse.json(
      {
        error:
          message ===
          "AUTH_REQUIRED"
            ? "Authentification requise."
            : message ===
                "PROFILE_REQUIRED"
              ? "Profil utilisateur introuvable."
              : message ===
                  "FORBIDDEN"
                ? "Acces refuse."
                : message,
      },
      {
        status,
      }
    );
  }
}
