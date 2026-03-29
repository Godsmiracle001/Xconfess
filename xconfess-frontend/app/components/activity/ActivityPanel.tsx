"use client";

import { useActivityStore } from "@/app/lib/store/activity.store";
import type { ChainActivity } from "@/app/lib/types/activity"; // correct type

export default function ActivityPanel() {
  const activities: ChainActivity[] = useActivityStore((s) => s.activities);

  const getStatusClass = (status: ChainActivity["status"]) => {
    switch (status) {
      case "confirmed":
        return "text-green-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-yellow-600";
    }
  };

  return (
    <div className="p-4 bg-white shadow rounded-xl">
      <h2 className="text-lg font-semibold mb-4">Chain Activity</h2>

      {activities.length === 0 && (
        <p className="text-sm text-gray-500">No activity yet</p>
      )}

      <div className="space-y-3">
        {activities.map((a) => (
          <div
            key={a.id}
            className="border p-3 rounded-lg flex justify-between"
          >
            <div>
              <p className="font-medium">{a.type.toUpperCase()}</p>
              <p className="text-sm text-gray-500">
                Confession: {a.confessionId ?? "N/A"}
              </p>
            </div>

            <span className={`text-sm ${getStatusClass(a.status)}`}>
              {a.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
