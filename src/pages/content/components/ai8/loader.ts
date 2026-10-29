// ai8 SSE fetch interceptor -- injected into ai8.rcouyi.com page world
// The chat sends POST {origin}/chat/completions and streams SSE events, each a JSON envelope:
//   data: {"code":0,"data":"hello"}     text delta, appended to the answer
//   data: {"code":0,"data":{...}}       structured payload, not part of the answer
//   data: {"code":1,"err":"..."}        error, appended to the answer
//   data: [DONE]                        end of stream
(function () {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch(...args);

    const url = String(args[0] instanceof Request ? args[0].url : args[0]);
    const contentType = response.headers.get('content-type') || '';
    if (!url.includes('/chat/completions') || !contentType.includes('text/event-stream')) {
      return response;
    }

    const clone = response.clone();
    const reader = clone.body?.getReader();
    const decoder = new TextDecoder('utf-8');

    let buffer = '';
    let fullAssistantMessage = '';

    async function readStream() {
      if (!reader) return;

      let finished = false;
      while (!finished) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() as string;

        for (const event of events) {
          for (const line of event.split(/\r?\n/)) {
            if (!line.startsWith('data:')) continue;
            const dataStr = line.substring('data:'.length).trim();
            if (dataStr === '[DONE]') {
              finished = true;
              break;
            }

            try {
              const obj = JSON.parse(dataStr);
              if (obj.code === 0 && typeof obj.data === 'string') {
                fullAssistantMessage += obj.data;
              } else if (obj.code !== 0) {
                fullAssistantMessage += `\n${obj.err}`;
              }
            } catch {
              // skip non-JSON lines
            }
          }
          if (finished) break;
        }
      }

      reader.cancel().catch(() => {});

      // Answers are JSON when the prompt asks for it; otherwise pass the raw text through
      const parsed = extractAndParseJson(fullAssistantMessage);
      window.postMessage({ data: parsed ?? fullAssistantMessage }, '*');
    }

    function extractAndParseJson(str: string, fallback: any = null) {
      try {
        return JSON.parse(str.trim());
      } catch {
        const jsonMatch = str.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return fallback;
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          return fallback;
        }
      }
    }

    readStream().catch((err) => console.error('[ApiBeam ai8] SSE read error:', err));
    return response;
  };
})();
