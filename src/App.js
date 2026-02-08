import React, { useEffect, useState } from "react";

/**
 * Remove leading emoji: "🟣 AUDF" → "AUDF"
 */
// const normalizeLabel = (label = "") =>
//   label.replace(/^\p{Extended_Pictographic}+\s*/u, "").trim();

export default function App() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [merklRes, duneRes] = await Promise.all([
          fetch(
            "https://api.merkl.xyz/v4/opportunities/?status=LIVE&campaigns=false&mainProtocolId=stabull",
          ),
          fetch(
            "https://api.dune.com/api/v1/query/4000045/results?limit=1000&api_key=A48Zboan01ZtvLSuk4e0zkLHJu6B3nfO",
          ),
        ]);

        if (!merklRes.ok || !duneRes.ok) {
          throw new Error("API error");
        }

        const [merklPools, duneData] = await Promise.all([
          merklRes.json(),
          duneRes.json(),
        ]);

        const duneRows = duneData?.result?.rows || [];

        /**
         * Build Merkl lookup by pool name
         * { AUDF: pool, EURF: pool }
         */
        const merklMap = {};
        merklPools.forEach((pool) => {
          if (pool.name) {
            merklMap[pool.name.trim()] = pool;
          }
        });

        /**
         * Build final cards from DUNE rows
         */
        const finalCards = duneRows.map((row) => {
          const token = normalizeLabel(row.label);
          //const matchedPool = merklMap[token] || null;
          console.log(merklMap);
          const matchedPool = Object.entries(merklMap).find(([key]) =>
            key.toLowerCase().includes(token.toLowerCase()),
          );
          console.log("MATCHED POOL:" + token + " => ", matchedPool);
          //const matchedPool = match ? match[1] : null;
          //console.log(normalizeLabel(row.label));
          return {
            token,
            dune: row,
            merkl: matchedPool ? matchedPool[1] : null, // matchedPool is [key, pool]
          };
        });

        setCards(finalCards);
      } catch (err) {
        console.error(err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-950 text-white">
        Loading tokens…
      </div>
    );
  }
  function normalizeLabel(label) {
    return label
      .replace(/\p{Extended_Pictographic}/gu, "") // remove emojis
      .trim();
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-950 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-cyan-900 text-white p-6">
      <h1 className="text-4xl font-bold mb-10 text-center">
        Stabull Token Dashboard
      </h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards
          .filter((card) => card.merkl)
          .map(({ token, dune, merkl }) => (
            <div
              key={token}
              className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-5 shadow-lg"
            >
              {/* TOKEN HEADER */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-semibold">{token}</h2>
                <span className="text-sm text-cyan-300">
                  {dune.chain?.toUpperCase()}
                </span>
              </div>

              {/* DUNE DATA */}
              <div className="text-sm space-y-1 text-gray-200">
                <p>
                  <span className="text-gray-400">Price:</span> $
                  {dune.last_price?.toFixed(4)}
                </p>
                <p>
                  <span className="text-gray-400">TVL:</span> $
                  {merkl.tvl?.toLocaleString()}
                </p>
                <p>
                  <span className="text-gray-400">30d Volume:</span> $
                  {dune.volume_30d_usd?.toLocaleString()}
                </p>
                <p>
                  <span className="text-gray-400">Trades:</span>{" "}
                  {dune.num_trades}
                </p>
                <p>
                  <span className="text-gray-400">
                    APR BASED ON 30d VOLUME (0.0105% fee):
                  </span>
                  {(
                    ((((dune.volume_30d_usd * 0.000105) / 30) * 365) /
                      merkl.tvl) *
                    100
                  )?.toFixed(2)}
                  %
                </p>
              </div>

              {/* MERKL DATA (ONLY IF MATCHED) */}
              {merkl && (
                <div className="mt-4 border-t border-white/20 pt-4 text-sm">
                  <p>
                    <span className="text-gray-400">MERKL APR:</span>{" "}
                    {merkl.apr?.toFixed(2)}%
                  </p>
                  <p>
                    <span className="text-gray-400">
                      Total APY (Based on 30d Volume):
                    </span>{" "}
                    {(
                      ((((dune.volume_30d_usd * 0.000105) / 30) * 365) /
                        merkl.tvl) *
                        100 +
                      merkl.apr
                    )?.toFixed(2)}
                  </p>

                  {merkl.depositUrl && (
                    <a
                      href={merkl.depositUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block text-center bg-gradient-to-r from-cyan-500 to-blue-500 py-2 rounded-lg font-semibold hover:opacity-90"
                    >
                      Deposit →
                    </a>
                  )}
                </div>
              )}

              {/* {!merkl && (
              <p className="mt-4 text-xs text-yellow-300">
                No Merkl pool found
              </p>
            )} */}
            </div>
          ))}
      </div>
    </div>
  );
}
