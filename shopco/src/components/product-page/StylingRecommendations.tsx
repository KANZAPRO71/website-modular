import ProductListSec from "@/components/common/ProductListSec";
import { getStylingRecommendations } from "@/lib/recommendations";

export default function StylingRecommendations({
  productId,
}: {
  productId: number;
}) {
  const recommendations = getStylingRecommendations(productId);

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <ProductListSec
      title="COMPLETE THE LOOK"
      data={recommendations}
    />
  );
}
