import * as React from "react";
import { VisualizerWrapper } from "./VisualizerWrapper";

export const ShikiComponent: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="px-4">
      <div className="p-8">
        <VisualizerWrapper fixture={data} showCommand={true} />
      </div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};
