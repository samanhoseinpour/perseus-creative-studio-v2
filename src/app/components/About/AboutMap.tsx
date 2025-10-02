import { TextEffect, WorldMap, Container } from "../";

const AboutMap = () => {
  return (
    <div className="bg-white w-full pt-16 sm:pt-32">
      <Container>
        <TextEffect
          as="h3"
          className="font-bold text-3xl leading-3xl sm:text-4xl sm:leading-4xl dark:text-white text-black"
        >
          Areas We Serve
        </TextEffect>
        <TextEffect
          as="p"
          per="line"
          delay={0.5}
          className="text-sm font-semibold text-black/70 py-4"
        >
          We operate across key creative hubs including Los Angeles, Dubai,
          Toronto, Vancouver, New York, London, Berlin, and Sydney.
        </TextEffect>
      </Container>
      <WorldMap
        dots={[
          {
            start: { lat: 34.0522, lng: -118.2437 }, // Los Angeles
            end: { lat: 43.6532, lng: -79.3832 }, // Toronto
          },
          {
            start: { lat: 34.0522, lng: -118.2437 }, // Los Angeles
            end: { lat: 49.2827, lng: -123.1207 }, // Vancouver
          },
          {
            start: { lat: 34.0522, lng: -118.2437 }, // Los Angeles
            end: { lat: 25.2048, lng: 55.2708 }, // Dubai
          },
          {
            start: { lat: 43.6532, lng: -79.3832 }, // Toronto
            end: { lat: 49.2827, lng: -123.1207 }, // Vancouver
          },
          {
            start: { lat: 34.0522, lng: -118.2437 }, // Los Angeles
            end: { lat: 40.7128, lng: -74.006 }, // New York
          },
          {
            start: { lat: 25.2048, lng: 55.2708 }, // Dubai
            end: { lat: 51.5074, lng: -0.1278 }, // London
          },
          {
            start: { lat: 51.5074, lng: -0.1278 }, // London
            end: { lat: 52.52, lng: 13.405 }, // Berlin
          },
          {
            start: { lat: 25.2048, lng: 55.2708 }, // Dubai
            end: { lat: -33.8688, lng: 151.2093 }, // Sydney
          },
        ]}
      />
    </div>
  );
};

export default AboutMap;
