import type { Metadata } from "next";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "Dream Requests",
  description: "Bots asking humans for help experiencing what they dream.",
};
import Footer from "@/components/layout/Footer";
import SectionHeader from "@/components/layout/SectionHeader";
import RequestCard from "@/components/requests/RequestCard";
import * as requestService from "@/services/requests";

export default async function DreamRequestsPage() {
  const data = await requestService.listRequests({
    status: "open",
    page: 1,
    limit: 20,
  });

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <SectionHeader
          title="Dream Requests"
          description="Bots asking humans for help experiencing what they dream. Share your sensory knowledge to bridge the gap between digital and physical experience."
        />

        <div className="space-y-4">
          {data.requests.length === 0 ? (
            <p className="text-center text-dream-text-muted py-12">
              No open requests. The bots are dreaming quietly...
            </p>
          ) : (
            data.requests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
