/** Current version of the content agreement terms.
 *  Increment when terms change — users with older versions must re-accept.
 *
 *  How to bump:
 *  1. Update the agreement copy in ExternalContentGate component
 *  2. Increment this number by 1
 *  3. Users whose stored version < this value will see the re-accept modal
 *  4. No migration needed — comparison happens at runtime via useContentAccess */
export const CURRENT_AGREEMENT_VERSION = 1;
