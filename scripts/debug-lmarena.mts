const row = `<span class="body-sm">1471</span><span class="text-text-tertiary body-xs">±5</span></div></td><td class="p-2"><span class="body-sm">26,973</span></td><td class="p-2"><span class="text-sm">$1.40<!-- --> / <!-- -->$4.40</span></td>`;

console.log('votes1:', (row.match(/body-sm">([\d,]+)<\/span>/g) || []).map(m => m));
console.log('price:', JSON.stringify(row.match(/\$([\d.]+)[\s\S]{0,40}\/\$([\d.]+)/)));
console.log('price2:', JSON.stringify(row.match(/\$([\d.]+)[\s\S]*?\$([\d.]+)/)));
console.log('elo:', JSON.stringify(row.match(/body-sm">(\d{3,4})<\/span><span class="text-text-tertiary body-xs">/)));
