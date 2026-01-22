import * as React from "react";
import { VisualizerWrapper } from "./VisualizerWrapper";

interface ShikiComponentProps {
  data: any; // TODO: Replace `any` with a more specific type if possible
}

export const ShikiComponent: React.FC<ShikiComponentProps> = ({ data }) => {
  return (
    <div className="px-4">
      <div className="p-8">
        <VisualizerWrapper fixture={data} showCommand={true} animated={true} />
      </div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};
