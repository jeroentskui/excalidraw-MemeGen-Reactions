import React, { useState, useEffect } from "react";
import clsx from "clsx";
import { Island } from "./Island";
import { FilledButton } from "./FilledButton";
import Stack from "./Stack";

interface MemeGeneratorPanelProps {
  onGenerate: (template: string, topCaption: string, bottomCaption: string) => void;
  onClose: () => void;
}

export const MemeGeneratorPanel: React.FC<MemeGeneratorPanelProps> = ({ onGenerate, onClose }) => {
  const [topCaption, setTopCaption] = useState("");
  const [bottomCaption, setBottomCaption] = useState("");
  const [templates, setTemplates] = useState<{ id: string; name: string; blank: string }[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("https://api.memegen.link/templates/")
      .then((res) => res.json())
      .then((data) => {
        setTemplates(data);
        if (data.length > 0) setSelectedTemplate(data[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = () => {
    if (!selectedTemplate) return;
    onGenerate(selectedTemplate, topCaption, bottomCaption);
  };

  return (
    <Island style={{ minWidth: 420, maxWidth: 640, background: '#fff', borderRadius: 16, boxShadow: '0 4px 32px #0001', padding: 0, border: '1px solid #ececec' }}>
      <div style={{ padding: 24, paddingBottom: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 12 }}>Meme Generator</div>
        <div style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>Pick a template, add your captions, and click Generate Meme.</div>
      </div>
      <div style={{ padding: '0 24px', marginBottom: 16 }}>
        <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 8 }}>Templates</div>
        <div style={{
          background: '#f7f7fa',
          border: '1px solid #ececec',
          borderRadius: 10,
          padding: 8,
          maxHeight: 220,
          overflowY: 'auto',
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#aaa', padding: 32 }}>Loading templates...</div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
              gap: 12,
            }}>
              {templates.map((t) => (
                <div
                  key={t.id}
                  className={clsx('meme-template-thumb', { selected: selectedTemplate === t.id })}
                  style={{
                    cursor: 'pointer',
                    border: selectedTemplate === t.id ? '2px solid #4f8cff' : '2px solid transparent',
                    borderRadius: 8,
                    background: selectedTemplate === t.id ? '#eaf3ff' : '#fff',
                    boxShadow: selectedTemplate === t.id ? '0 0 0 2px #4f8cff33' : undefined,
                    padding: 4,
                    transition: 'border 0.2s, box-shadow 0.2s, background 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                  onClick={() => setSelectedTemplate(t.id)}
                  tabIndex={0}
                  title={t.name}
                >
                  <img
                    src={t.blank}
                    alt={t.name}
                    style={{
                      width: 90,
                      height: 90,
                      objectFit: 'contain',
                      marginBottom: 4,
                      borderRadius: 6,
                      border: '1px solid #ddd',
                      background: '#fff',
                    }}
                  />
                  <div style={{ fontSize: 12, textAlign: 'center', color: '#333', wordBreak: 'break-word', marginTop: 2 }}>{t.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ padding: '0 24px 24px 24px' }}>
        <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 8, marginTop: 8 }}>Captions</div>
        <Stack.Col gap={2}>
          <input
            type="text"
            placeholder="Top Caption"
            value={topCaption}
            onChange={e => setTopCaption(e.target.value)}
            style={{ fontSize: 15, padding: 8, borderRadius: 6, border: '1px solid #e0e0e0', background: '#fafbfc', outline: 'none', marginBottom: 4 }}
          />
          <input
            type="text"
            placeholder="Bottom Caption"
            value={bottomCaption}
            onChange={e => setBottomCaption(e.target.value)}
            style={{ fontSize: 15, padding: 8, borderRadius: 6, border: '1px solid #e0e0e0', background: '#fafbfc', outline: 'none' }}
          />
          <Stack.Row gap={2} style={{ marginTop: 12 }}>
            <span style={!selectedTemplate ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
                  <FilledButton
                    label="Generate Meme"
                    onClick={handleGenerate}
                    size="large"
                    className="meme-generate-btn"
                  />
            </span>
                <FilledButton
                  label="Close"
                  onClick={onClose}
                  color="muted"
                  size="large"
                  className="meme-close-btn"
                />
          </Stack.Row>
        </Stack.Col>
      </div>
    </Island>
  );
};
