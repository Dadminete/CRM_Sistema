(async()=>{
  const base='http://172.16.0.25:3000/api/suscripciones/por-dia-facturacion';
  const d15 = await fetch(`${base}?diaFacturacion=15`).then(r=>r.json()).catch(()=>null);
  const d30 = await fetch(`${base}?diaFacturacion=30`).then(r=>r.json()).catch(()=>null);

  const pick = (data,name)=> {
    if(!data?.success) return null;
    return data.data.suscripciones.find((s)=>`${s.cliente_nombre} ${s.cliente_apellidos}`.toLowerCase().includes(name));
  };

  console.log(JSON.stringify({
    day15_total: d15?.data?.total ?? null,
    day30_total: d30?.data?.total ?? null,
    yokabel_en_15: !!pick(d15,'yokabel gil'),
    graciela_en_30: !!pick(d30,'graciela hernandez')
  },null,2));
})();
