const body = {
  idsToDelete: [
    "1c7f5a12-8c55-4083-b7c0-b838337abf95",
    "615fa431-c09b-41f5-a509-65d58de2f9f6",
    "94745e1d-b53e-4c4c-9565-aa07cd3aff2e"
  ],
  cajaId: "c5ab2edc-d32c-494d-b454-d1731c6c31df",
  newBalance: 11800
};

fetch("http://172.16.0.25:3000/api/admin/fix-duplicates", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
})
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error("Error:", err));
