'use client';

import React, { createContext, useContext } from 'react';
import {
  DEFAULT_EVENT_TIMES,
  type EventTimes,
} from '@/lib/deadline';

const EventTimesContext = createContext<EventTimes>(DEFAULT_EVENT_TIMES);

export function EventTimesProvider({
  times,
  children,
}: {
  times: EventTimes;
  children: React.ReactNode;
}) {
  return (
    <EventTimesContext.Provider value={times}>
      {children}
    </EventTimesContext.Provider>
  );
}

export function useEventTimes(): EventTimes {
  return useContext(EventTimesContext);
}
