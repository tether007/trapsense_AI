import { Suspense, lazy } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

export function InteractiveRobotSpline({ scene, className = "" }) {
  return (
    <Suspense
      fallback={
        <div
          className={`w-full h-full flex items-center justify-center bg-gray-900 text-white ${className}`}
        >
          <svg
            className="animate-spin h-5 w-5 text-white mr-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l2-2.647z"
            ></path>
          </svg>
        </div>
      }
    >
      <Spline scene={scene} className={className} />
    </Suspense>
  );
}
