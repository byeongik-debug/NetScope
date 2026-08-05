import React from 'react';
import {View} from 'react-native';
import {EventCard} from '../../components/EventCard';
import {Screen} from '../../components/Screen';
import {AppText} from '../../components/Typography';
import {colors} from '../../constants/theme';
import {useApp} from '../../context/AppContext';

export function EventsScreen() {
  const {events} = useApp();
  return <Screen><View><AppText variant="title">Live Events</AppText><AppText style={{color: colors.textMuted}}>WebSocket event stream</AppText></View>{events.map(event => <EventCard key={`${event.id}-${event.occurredAt}`} event={event} />)}</Screen>;
}
