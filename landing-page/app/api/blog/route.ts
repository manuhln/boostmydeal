import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  try {
    if (id) {
      const response = await fetch(`http://172.16.20.32:8781/wp-json/wp/v2/posts/${id}?_embed=true`);

      if (!response.ok) {
        return NextResponse.json({ error: "Post not found" }, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    const response = await fetch("http://172.16.20.32:8781/wp-json/wp/v2/posts?_embed=true");

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch posts" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
