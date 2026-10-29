import { useCallback, useEffect } from 'react';
import { useMessageHandler } from '../../shared/useMessageHandler';
import { waitForElement } from '../../shared/utils';

export const Ai8 = () => {
  const sendToChat = useCallback(
    async (content: { route: string; body: object }, prompt: string) => {
      const editor = await waitForElement('textarea.n-input__textarea-el') as HTMLTextAreaElement;

      if (!editor) {
        console.error('[ApiBeam ai8] Could not find ai8 input textarea');
        return;
      }

      const text = `${prompt ? prompt + '\n' : ''}Route: ${content.route}\nPayload: ${JSON.stringify(content.body)}`;

      editor.focus();

      // Naive UI binds the textarea through Vue, so use the native setter to trigger change detection
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(editor, text);
      } else {
        editor.value = text;
      }
      editor.dispatchEvent(new Event('input', { bubbles: true }));

      window.setTimeout(() => {
        // The first primary button in the input toolbar is Send; it stays disabled while the input is empty
        const sendBtn = document.querySelector('.aa-chat-input button.n-button--primary-type') as HTMLButtonElement;
        if (sendBtn && !sendBtn.disabled) {
          sendBtn.click();
        }
      }, 200);
    },
    []
  );

  const runLastScript = (json: object) => {
    if (json) {
      chrome.runtime.sendMessage({ type: 'question_answer', content: json });
    }
  };

  useMessageHandler(sendToChat);

  useEffect(() => {
    const newScript = document.createElement('script');
    newScript.src = chrome.runtime.getURL('loader-ai8.js');
    document.body.appendChild(newScript);
    newScript.onload = () => {
      window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        const { data } = event.data || {};
        runLastScript(data);
      });
    };
  }, []);

  return <div />;
};
