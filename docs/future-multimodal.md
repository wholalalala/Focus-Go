# Future multimodal interfaces

No microphone/camera capture or permission request is implemented. Future modalities reserved by design: VOICE, CAMERA, GESTURE, BODY_MOVEMENT, OBJECT_ACTION.

```ts
interface ObservationInputProvider {
  modality: 'VOICE' | 'CAMERA' | 'GESTURE' | 'BODY_MOVEMENT' | 'OBJECT_ACTION';
  start(context: { sessionId: string; consentId: string }): Promise<void>;
  stop(): Promise<void>;
  subscribe(listener: (observation: {
    timestampMs: number; value: unknown; confidence?: number;
  }) => void): () => void;
}
```

A future provider must normalize observations into task-defined responses, document uncertainty, log provenance, support cancellation and separate consent/data retention. Any probabilistic recognition must not masquerade as objective ground truth. Core scoring remains deterministic given a normalized response. A new modality needs fresh protocol/version and validation work before baseline comparisons.

SpeechOutputProvider is implemented separately using browser SpeechSynthesis. It is output-only, optional, cancellable and not coupled to task scoring. Voice availability is device-dependent; visual instructions always remain available.
