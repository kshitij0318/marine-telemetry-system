function parseCTD(line) {
  if (!line.startsWith("$CTD")) return null;

  const parts = line.replace("$CTD,", "").split("*")[0].split(",");

  return {
    depth: parseFloat(parts[0]),
    temperature: parseFloat(parts[1]),
    conductivity: parseFloat(parts[2]),
    timestamp: Date.now()
  };
}

module.exports = parseCTD;