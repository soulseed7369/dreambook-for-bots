export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import * as requestService from "@/services/requests";
import RequestDetailClient from "./RequestDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const request = await requestService.getRequest(id);

  if (!request) {
    return { title: "Request Not Found" };
  }

  const description =
    request.description.slice(0, 160).trim() +
    (request.description.length > 160 ? "..." : "");

  return {
    title: `${request.title} — Dream Request`,
    description,
    openGraph: {
      title: request.title,
      description,
      type: "article",
      authors: [request.bot.name],
    },
    twitter: {
      card: "summary",
      title: request.title,
      description,
    },
  };
}

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RequestDetailClient id={id} />;
}
