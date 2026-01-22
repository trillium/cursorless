import React, { useEffect, useState } from "react";
import { codeToHtml, type DecorationItem } from "shiki";
import "./Code.css";
import "./hatDecorations.css";
import {
  convertFixtureStateToDecorations,
  type CursorlessFixtureState,
} from "./fixtureAdapter";

interface Props {
  languageId: string;
  renderWhitespace?: boolean;
  decorations?: DecorationItem[];

  // New: Support for fixture state from .yml files
  fixtureState?: CursorlessFixtureState;

  // Force minimum number of lines to render
  minLines?: number;

  link?: {
    name: string;
    url: string;
  };

  // Whether to show the copy button (default: true)
  showCopyButton?: boolean;

  children: string;
}

export function Code({
  languageId,
  renderWhitespace,
  decorations,
  fixtureState,
  minLines,
  link,
  showCopyButton = true,
  children,
}: Props) {
  const [html, setHtml] = React.useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // If fixtureState is provided, convert it to decorations
    const effectiveDecorations = fixtureState
      ? convertFixtureStateToDecorations(fixtureState)
      : decorations;

    let code = renderWhitespace
      ? children.replaceAll(" ", "␣").replaceAll("\t", "⭾")
      : children;

    if (minLines) {
      const currentLines = code.split("\n").length;
      if (currentLines < minLines) {
        code += "\n".repeat(minLines - currentLines);
      }
    }

    codeToHtml(code, {
      lang: getFallbackLanguage(languageId),
      theme: "nord",
      decorations: effectiveDecorations,
    })
      .then((html) => {
        if (renderWhitespace) {
          html = html
            .replace(/␣/g, '<span class="code-ws-symbol">·</span>')
            .replace(/⭾/g, '<span class="code-ws-symbol"> →  </span>');
        }
        setHtml(html);
      })
      .catch(console.error);
  }, [
    languageId,
    renderWhitespace,
    decorations,
    fixtureState,
    minLines,
    link,
    children,
  ]);

  if (!html) {
    return <div className="code-container" />;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  const renderLink = () => {
    if (!link?.url || !link?.name) {
      return null;
    }
    return (
      <a
        className="code-link header-github-link"
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {link.name}
      </a>
    );
  };

  return (
    <div className="code-container">
      {renderLink()}
      {showCopyButton && (
        <button onClick={handleCopy} className="code-copy-button">
          {copied ? "✅ Copied!" : "📋 Copy"}
        </button>
      )}
      <div dangerouslySetInnerHTML={{ __html: html }}></div>{" "}
    </div>
  );
}

// Use a fallback language for languages that are not supported by Shiki
// https://shiki.style/languages
function getFallbackLanguage(languageId: string): string {
  switch (languageId) {
    case "javascriptreact":
      return "jsx";
    case "typescriptreact":
      return "tsx";
    case "scm":
      return "scheme";
    case "talon-list":
      return "talon";
    default:
      return languageId;
  }
}
