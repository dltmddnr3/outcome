import type { DestinationAnswers, DestinationDomainId, BriefEvidence } from './destination-discovery'
export function analyzeDestinationBrief(text: string): { answers: DestinationAnswers; conflicts: DestinationDomainId[]; evidence: BriefEvidence[] }
