import React from "react";
import {
  CheckCircle,
  Cancel,
  Error as ErrorIcon,
} from "@mui/icons-material"; // Keeping icons as-is

function PredictionDisplay({ prediction, loading }) {
  React.useEffect(() => {
    if (prediction) console.log("PredictionDisplay received:", prediction);
  }, [prediction]);

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-md flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full border-4 border-gray-300 border-t-4 border-t-blue-500 h-10 w-10" />
        <span className="text-gray-500 text-sm">Processing image...</span>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="p-4 bg-gray-50 rounded-md">
        <span className="text-gray-500 text-sm">Waiting for predictions...</span>
      </div>
    );
  }

  const classification = prediction.classification || "unknown";
  const confidence = prediction.confidence || 0;
  const species = prediction.species || "";
  const predictions = prediction.predictions || [];

  const speciesList =
    typeof species === "string"
      ? species.split(",").filter(Boolean)
      : Array.isArray(species)
      ? species
      : [];

  const predictionsList =
    typeof predictions === "string"
      ? (() => {
          try {
            return JSON.parse(predictions);
          } catch {
            return [];
          }
        })()
      : Array.isArray(predictions)
      ? predictions
      : [];

  const isBlank = classification === "blank";
  const isNonBlank = classification === "non-blank";
  const isError = classification === "error";

  return (
    <div className="p-4 bg-gray-50 rounded-md">
      {/* Error state */}
      {isError && (
        <div className="flex items-center gap-1 text-red-600 font-semibold">
          <ErrorIcon />
          <span>Processing Error</span>
        </div>
      )}

      {/* Classification Result */}
      {!isError && (
        <>
          <div className="flex items-center gap-2 mb-2">
            {isBlank && <Cancel className="text-gray-400 text-2xl" />}
            {isNonBlank && <CheckCircle className="text-green-500 text-2xl" />}
            <div>
              <div className="font-bold text-gray-800 text-lg">
                {isBlank ? "Blank Image" : "Animal Detected"}
              </div>
              <div className="text-gray-500 text-sm">
                Confidence: {(confidence * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Species Detected */}
          {isNonBlank && speciesList.length > 0 && (
            <>
              <hr className="my-2 border-gray-300" />
              <div>
                <div className="font-semibold text-sm mb-1">Species Detected:</div>
                <div className="flex flex-wrap gap-1">
                  {speciesList.map((sp, idx) => (
                    <span
                      key={idx}
                      className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                    >
                      {sp.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Detection Details */}
          {isNonBlank && predictionsList.length > 0 && (
            <>
              <hr className="my-2 border-gray-300" />
              <div>
                <div className="font-semibold text-sm mb-1">
                  Detections ({predictionsList.length}):
                </div>
                <div className="flex flex-col gap-2 mt-1">
                  {predictionsList.map((det, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-white border border-gray-300 rounded flex justify-between items-center flex-col gap-1"
                    >
                      <div className="flex justify-between w-full">
                        <span className="font-medium text-gray-700">
                          {det.class_name || "Unknown"}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            (det.confidence || 0) > 0.7
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {((det.confidence || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                      {det.bbox && (
                        <div className="text-gray-500 text-xs">
                          Box: [{(det.bbox || [])
                            .map((v) =>
                              typeof v === "number" ? v.toFixed(1) : v
                            )
                            .join(", ")}]
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* No detections */}
          {isNonBlank && predictionsList.length === 0 && (
            <>
              <hr className="my-2 border-gray-300" />
              <div className="text-gray-500 text-sm">
                No specific objects detected, but image is not blank.
              </div>
            </>
          )}
        </>
      )}

      {/* Debug info */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
          <pre>{JSON.stringify(prediction, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default PredictionDisplay;
