// src/constants/tags.js
export const TAG_GROUPS = {
  Intent: [
    'Anxiety Relief',
    'Boundary Setting',
    'Emotional Cleansing',
    'Energy Protection',
    'Stress Release',
    'Confidence Building',
    'Letting Go',
    'Self-Permission',
    'Guilt Release',
    'Overwhelm Relief',
  ],
  Situation: [
    'After Difficult Conversation',
    'Before Bed',
    'After Work',
    'End of Day',
    'Morning Ritual',
    'Before Interaction',
    'Emergency Use',
    'Daily Practice',
    'When Stuck',
    'When Overwhelmed',
  ],
  Supplies: [
    'No Supplies Needed',
    'Kitchen Items Only',
    'Candles Required',
    'Bath/Water Access',
    'Paper & Pen',
    'Household Items',
  ],
};

export const ALL_TAGS = Object.values(TAG_GROUPS).flat();
