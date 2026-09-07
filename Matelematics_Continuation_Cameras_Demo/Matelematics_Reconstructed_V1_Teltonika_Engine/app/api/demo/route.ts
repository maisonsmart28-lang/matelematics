import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

type DemoRequest = {
  fullName: string;
  companyName: string;
  phone: string;
  email: string;
  vehicleCount: string;
  sector: string;
  message?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<DemoRequest>;

    const fullName = body.fullName?.trim();
    const companyName = body.companyName?.trim();
    const phone = body.phone?.trim();
    const email = body.email?.trim();
    const vehicleCount = body.vehicleCount?.trim();
    const sector = body.sector?.trim();
    const message = body.message?.trim() ?? "";

    if (!fullName || !companyName || !phone || !email || !vehicleCount || !sector) {
      return NextResponse.json(
        { error: "Tous les champs requis doivent être remplis" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    const requiredEnv = [
      "MAIL_HOST",
      "MAIL_PORT",
      "MAIL_USER",
      "MAIL_PASSWORD",
      "MAIL_FROM",
    ] as const;

    const missingEnv = requiredEnv.filter((name) => !process.env[name]);
    if (missingEnv.length > 0) {
      console.error("Configuration mail incomplète:", missingEnv.join(", "));
      return NextResponse.json(
        { error: "Le service de démonstration est temporairement indisponible." },
        { status: 503 }
      );
    }

    const port = Number(process.env.MAIL_PORT);
    if (!Number.isInteger(port) || port <= 0) {
      return NextResponse.json(
        { error: "Configuration du service de messagerie invalide." },
        { status: 503 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    const adminMailOptions = {
      from: process.env.MAIL_FROM,
      to: process.env.MAIL_TO ?? "contact@matelematics.com",
      subject: "Nouvelle demande de démonstration",
      text: [
        `Nom: ${fullName}`,
        `Entreprise: ${companyName}`,
        `Téléphone: ${phone}`,
        `Email: ${email}`,
        `Nombre de véhicules: ${vehicleCount}`,
        `Secteur d'activité: ${sector}`,
        `Message: ${message || "Aucun"}`,
      ].join("\n"),
    };

    const clientMailOptions = {
      from: process.env.MAIL_FROM,
      to: email,
      subject: "Confirmation de votre demande de démonstration",
      text: `Bonjour ${fullName},\n\nNous avons bien reçu votre demande de démonstration.\n\nNotre équipe vous contactera prochainement afin de planifier une présentation.\n\nMerci,\nÉquipe Matelematics`,
    };

    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(clientMailOptions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de l'envoi de la demande de démonstration:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi de l'email" },
      { status: 500 }
    );
  }
}
