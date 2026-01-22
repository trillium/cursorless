import * as React from "react";
import { ShikiComponent } from "./components/component-shiki";
import "./shiki.css";
import "./styles.css";

interface TestCaseComponentPageProps {
  data?: any;
  loaded: any[];
}

export const TestCaseComponentPage: React.FC<TestCaseComponentPageProps> = ({
  data: _data,
  loaded,
}) => {
  return (
    <main className="dark:text-stone-100">
      <h1 className="mt-2 mb-1 text-center text-2xl md:text-3xl xl:mt-4">
        Test Component Sheet FOOOOO{" "}
        <small className="block text-sm">
          See the {/* <SmartLink to={"https://www.cursorless.org/docs/"}> */}
          full documentation
          {/* </SmartLink>{" "} */}
          to learn more. Boop.
        </small>
      </h1>

      {loaded.map((item: any) => (
        <ShikiComponent data={item} key={item.command} />
      ))}
    </main>
  );
};
