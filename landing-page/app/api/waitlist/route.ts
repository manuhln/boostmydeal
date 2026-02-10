import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstname, lastname, email, phone, company } = body;

    if (!email || !firstname || !lastname) {
      return NextResponse.json({ success: false, message: "Champs requis manquants" }, { status: 400 });
    }

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "A:E",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[firstname, lastname, email, phone, company, new Date().toISOString()]],
      },
    });

    return NextResponse.json({ success: true, message: "Ajouté à la waitlist 🎉" }, { status: 201 });
  } catch (error) {
    console.error("Erreur waitlist:", error);
    return NextResponse.json({ success: false, message: "Erreur serveur" }, { status: 500 });
  }
}
