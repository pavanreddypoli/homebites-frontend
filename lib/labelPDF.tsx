// Server-only — never import from any "use client" component
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// 4" × 6" at 72 dpi = 288 × 432 points
const W = 288;
const H = 432;

const s = StyleSheet.create({
  page:        { width: W, height: H, padding: 16, fontFamily: "Helvetica", backgroundColor: "#ffffff", display: "flex", flexDirection: "column" },
  headerText:  { fontSize: 7, color: "#888888", marginBottom: 8 },
  chefName:    { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
  chefAddr:    { fontSize: 9,  color: "#555555", marginBottom: 8 },
  dishName:    { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#1a1a1a", marginBottom: 6 },
  body10:      { fontSize: 10, color: "#333333", marginBottom: 4 },
  body10Bold:  { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
  tcsBox:      { marginBottom: 6, padding: 5, backgroundColor: "#FFF9E6", borderRadius: 3 },
  tcsHead:     { fontSize: 9,  fontFamily: "Helvetica-Bold", color: "#92400E", marginBottom: 2 },
  tcsBody:     { fontSize: 9,  fontFamily: "Helvetica-Oblique", color: "#92400E" },
  spacer:      { flex: 1 },
  disclaimer:  { border: 1, borderColor: "#000000", padding: 8 },
  disclaimerT: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#000000", textAlign: "center", lineHeight: 1.4 },
});

export interface LabelItem {
  dishName: string;
  allergens: string[];
  isTcs: boolean;
  quantity: number;
}

export interface LabelData {
  orderId: string;
  chefName: string;
  chefAddress: string;
  dshsId: string | null;
  items: LabelItem[];
  productionDate: string;
}

function LabelPage({ item, data, copyNumber, totalCopies }: {
  item: LabelItem;
  data: LabelData;
  copyNumber: number;
  totalCopies: number;
}) {
  const allergenDisplay = item.allergens.length > 0 ? item.allergens.join(", ") : null;

  return (
    <Page size={[W, H]} style={s.page}>
      <Text style={s.headerText}>
        {"HomeBites AI · Order #" + data.orderId.slice(0, 8).toUpperCase() +
          (totalCopies > 1 ? "  ·  " + copyNumber + " of " + totalCopies : "")}
      </Text>

      {data.dshsId ? (
        <Text style={s.chefName}>{"DSHS Reg: " + data.dshsId}</Text>
      ) : (
        <View>
          <Text style={s.chefName}>{data.chefName}</Text>
          <Text style={s.chefAddr}>{data.chefAddress}</Text>
        </View>
      )}

      <Text style={s.dishName}>{item.dishName}</Text>

      {allergenDisplay ? (
        <Text style={s.body10}>
          <Text style={s.body10Bold}>{"CONTAINS: "}</Text>
          {allergenDisplay}
        </Text>
      ) : (
        <Text style={s.body10}>{"Allergens: not specified by chef"}</Text>
      )}
      {/* TODO: Session 7 (moderation) will add AI-assisted allergen detection from dish name/ingredients */}

      <Text style={s.body10}>{"Made: " + data.productionDate}</Text>

      {item.isTcs && (
        <View style={s.tcsBox}>
          <Text style={s.tcsHead}>{"SAFE HANDLING INSTRUCTIONS:"}</Text>
          <Text style={s.tcsBody}>
            {"To prevent illness from bacteria, keep this food refrigerated or frozen until the food is prepared for consumption."}
          </Text>
        </View>
      )}

      <View style={s.spacer} />

      <View style={s.disclaimer}>
        <Text style={s.disclaimerT}>
          {"THIS PRODUCT WAS PRODUCED IN A PRIVATE RESIDENCE THAT IS NOT SUBJECT TO GOVERNMENTAL LICENSING OR INSPECTION."}
        </Text>
      </View>
    </Page>
  );
}

export function LabelDocument({ data }: { data: LabelData }) {
  return (
    <Document>
      {data.items.flatMap((item, i) =>
        Array.from({ length: item.quantity }, (_, copyIdx) => (
          <LabelPage
            key={i + "-" + copyIdx}
            item={item}
            data={data}
            copyNumber={copyIdx + 1}
            totalCopies={item.quantity}
          />
        ))
      )}
    </Document>
  );
}
