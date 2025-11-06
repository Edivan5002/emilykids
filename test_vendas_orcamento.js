// Test if orcamento_id would render
const testCases = [
  { id: "1", orcamento_id: "abc123456789" }, // Should render
  { id: "2", orcamento_id: null }, // Should NOT render  
  { id: "3", orcamento_id: "" }, // Should NOT render (empty string is falsy)
  { id: "4", orcamento_id: undefined }, // Should NOT render
  { id: "5" }, // Should NOT render (missing field)
];

testCases.forEach(venda => {
  const shouldRender = venda.orcamento_id && venda.orcamento_id.length > 0;
  console.log(`Venda ${venda.id}: orcamento_id="${venda.orcamento_id}" -> ${shouldRender ? '✅ RENDERS' : '❌ NO RENDER'}`);
});
