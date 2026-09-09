import { NextResponse } from "next/server";

import nodemailer from "nodemailer";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 20_000;

const demoRequestSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Nom invalide")
    .max(120, "Nom trop long"),

  companyName: z
    .string()
    .trim()
    .min(2, "Entreprise invalide")
    .max(160, "Nom d'entreprise trop long"),

  phone: z
    .string()
    .trim()
    .min(6, "Téléphone invalide")
    .max(40, "Téléphone trop long")
    .regex(
      /^[0-9+().\s-]+$/,
      "Téléphone invalide",
    ),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Email trop long")
    .email("Email invalide"),

  vehicleCount: z
    .string()
    .trim()
    .min(1, "Nombre de véhicules requis")
    .max(60, "Nombre de véhicules trop long"),

  sector: z
    .string()
    .trim()
    .min(2, "Secteur d'activité requis")
    .max(120, "Secteur d'activité trop long"),

  message: z
    .string()
    .trim()
    .max(2_000, "Message trop long")
    .optional()
    .default(""),

  /*
   * Champ honeypot anti-bot.
   * Le formulaire normal ne doit pas le remplir.
   * S'il est absent, le comportement actuel reste inchangé.
   */
  website: z
    .string()
    .max(200)
    .optional()
    .default(""),
});

function jsonError(
  error: string,
  status: number,
) {
  return NextResponse.json(
    { error },
    { status },
  );
}

function normalizeMailText(
  value: string,
) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

export async function POST(
  request: Request,
) {
  try {
    const contentType =
      request.headers.get("content-type") ?? "";

    if (
      !contentType
        .toLowerCase()
        .includes("application/json")
    ) {
      return jsonError(
        "Type de contenu invalide.",
        415,
      );
    }

    const contentLengthHeader =
      request.headers.get("content-length");

    if (contentLengthHeader) {
      const contentLength =
        Number(contentLengthHeader);

      if (
        !Number.isFinite(contentLength) ||
        contentLength < 0
      ) {
        return jsonError(
          "Requête invalide.",
          400,
        );
      }

      if (
        contentLength >
        MAX_BODY_BYTES
      ) {
        return jsonError(
          "Requête trop volumineuse.",
          413,
        );
      }
    }

    const rawBody =
      await request.text();

    if (
      Buffer.byteLength(
        rawBody,
        "utf8",
      ) >
      MAX_BODY_BYTES
    ) {
      return jsonError(
        "Requête trop volumineuse.",
        413,
      );
    }

    let parsedJson: unknown;

    try {
      parsedJson =
        JSON.parse(rawBody);
    } catch {
      return jsonError(
        "Requête JSON invalide.",
        400,
      );
    }

    const validation =
      demoRequestSchema.safeParse(
        parsedJson,
      );

    if (!validation.success) {
      const firstIssue =
        validation.error.issues[0];

      return jsonError(
        firstIssue?.message ??
          "Données invalides.",
        400,
      );
    }

    const {
      fullName,
      companyName,
      phone,
      email,
      vehicleCount,
      sector,
      message,
      website,
    } =
      validation.data;

    /*
     * Honeypot :
     * un bot qui remplit automatiquement ce champ reçoit une
     * réponse identique à une soumission réussie, mais aucun
     * email n'est envoyé.
     */
    if (website.trim()) {
      return NextResponse.json({
        success: true,
      });
    }

    const requiredEnv = [
      "MAIL_HOST",
      "MAIL_PORT",
      "MAIL_USER",
      "MAIL_PASSWORD",
      "MAIL_FROM",
    ] as const;

    const missingEnv =
      requiredEnv.filter(
        (name) =>
          !process.env[name]?.trim(),
      );

    if (
      missingEnv.length > 0
    ) {
      console.error(
        "Configuration mail incomplète:",
        missingEnv.join(", "),
      );

      return jsonError(
        "Le service de démonstration est temporairement indisponible.",
        503,
      );
    }

    const port =
      Number(
        process.env.MAIL_PORT,
      );

    if (
      !Number.isInteger(port) ||
      port <= 0 ||
      port > 65535
    ) {
      console.error(
        "Configuration MAIL_PORT invalide.",
      );

      return jsonError(
        "Configuration du service de messagerie invalide.",
        503,
      );
    }

    const mailHost =
      process.env.MAIL_HOST!.trim();

    const mailUser =
      process.env.MAIL_USER!.trim();

    const mailPassword =
      process.env.MAIL_PASSWORD!;

    const mailFrom =
      process.env.MAIL_FROM!.trim();

    const mailTo =
      process.env.MAIL_TO?.trim() ||
      "contact@matelematics.com";

    const transporter =
      nodemailer.createTransport({
        host: mailHost,
        port,
        secure: port === 465,
        auth: {
          user: mailUser,
          pass: mailPassword,
        },
      });

    const safeFullName =
      normalizeMailText(
        fullName,
      );

    const safeCompanyName =
      normalizeMailText(
        companyName,
      );

    const safePhone =
      normalizeMailText(
        phone,
      );

    const safeVehicleCount =
      normalizeMailText(
        vehicleCount,
      );

    const safeSector =
      normalizeMailText(
        sector,
      );

    const safeMessage =
      normalizeMailText(
        message,
      );

    const adminMailOptions = {
      from: mailFrom,
      to: mailTo,
      replyTo: email,
      subject:
        "Nouvelle demande de démonstration",
      text: [
        `Nom: ${safeFullName}`,
        `Entreprise: ${safeCompanyName}`,
        `Téléphone: ${safePhone}`,
        `Email: ${email}`,
        `Nombre de véhicules: ${safeVehicleCount}`,
        `Secteur d'activité: ${safeSector}`,
        `Message: ${safeMessage || "Aucun"}`,
      ].join("\n"),
    };

    const clientMailOptions = {
      from: mailFrom,
      to: email,
      subject:
        "Confirmation de votre demande de démonstration",
      text:
        `Bonjour ${safeFullName},\n\n` +
        "Nous avons bien reçu votre demande de démonstration.\n\n" +
        "Notre équipe vous contactera prochainement afin de planifier une présentation.\n\n" +
        "Merci,\n" +
        "Équipe Matelematics",
    };

    await transporter.sendMail(
      adminMailOptions,
    );

    await transporter.sendMail(
      clientMailOptions,
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Erreur lors de l'envoi de la demande de démonstration:",
      error,
    );

    return jsonError(
      "Erreur lors de l'envoi de l'email",
      500,
    );
  }
}
