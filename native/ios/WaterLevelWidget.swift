import WidgetKit
import SwiftUI

// MARK: - Telemetry Model for Widget
struct TankTelemetryEntry: TimelineEntry {
    let date: Date
    let tankName: String
    let levelPercentage: Int
    let volumeLiters: Int
    let maxCapacityLiters: Int
    let pumpActive: Boolean
    let sector: String
    let isCritical: Bool
}

// MARK: - Timeline Provider (Updates Every 15 Minutes or on Push)
struct WaterTelemetryProvider: TimelineProvider {
    func placeholder(in context: Context) -> TankTelemetryEntry {
        TankTelemetryEntry(
            date: Date(),
            tankName: "Tanque 1 (T1)",
            levelPercentage: 78,
            volumeLiters: 15600,
            maxCapacityLiters: 20000,
            pumpActive: true,
            sector: "Água Filtrada",
            isCritical: false
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (TankTelemetryEntry) -> ()) {
        let entry = TankTelemetryEntry(
            date: Date(),
            tankName: "Tanque 1 (T1)",
            levelPercentage: 78,
            volumeLiters: 15600,
            maxCapacityLiters: 20000,
            pumpActive: true,
            sector: "Água Filtrada",
            isCritical: false
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TankTelemetryEntry>) -> ()) {
        // Fetch latest telemetry from Hossidev SCADA API
        fetchLatestData { entry in
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
            completion(timeline)
        }
    }

    private func fetchLatestData(completion: @escaping (TankTelemetryEntry) -> Void) {
        guard let url = URL(string: "https://hossidev.watermonitor.app/api/telemetry/live") else {
            completion(placeholder(in: .init()))
            return
        }

        URLSession.shared.dataTask(with: url) { data, _, _ in
            if let data = data,
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let tanks = json["tanks"] as? [[String: Any]],
               let firstTank = tanks.first {
                
                let level = firstTank["levelPercentage"] as? Int ?? 78
                let volume = firstTank["currentVolumeLiters"] as? Int ?? 15600
                let capacity = firstTank["capacityLiters"] as? Int ?? 20000
                let pump = json["pumpActive"] as? Bool ?? true
                
                let entry = TankTelemetryEntry(
                    date: Date(),
                    tankName: firstTank["name"] as? String ?? "Tanque 1 (T1)",
                    levelPercentage: level,
                    volumeLiters: volume,
                    maxCapacityLiters: capacity,
                    pumpActive: pump,
                    sector: "Filtrada",
                    isCritical: level <= 15
                )
                completion(entry)
            } else {
                completion(placeholder(in: .init()))
            }
        }.resume()
    }
}

// MARK: - Small Widget View (2x2)
struct SmallWidgetView: View {
    let entry: TankTelemetryEntry

    var body: some View {
        ZStack {
            Color(red: 7/255, green: 13/255, blue: 25/255) // Deep Navy Background

            VStack(alignment: .leading, spacing: 6) {
                // Header with Hossidev Brand Icon & Title
                HStack(spacing: 5) {
                    Image("HossidevAppIcon")
                        .resizable()
                        .frame(width: 18, height: 18)
                        .clipShape(RoundedRectangle(cornerRadius: 4))

                    Text("HOSSIDEV")
                        .font(.system(size: 9, weight: .bold, design: .rounded))
                        .foregroundColor(Color(red: 56/255, green: 189/255, blue: 248/255)) // Cyan
                    
                    Spacer()
                    
                    Circle()
                        .fill(entry.pumpActive ? Color.green : Color.gray)
                        .frame(width: 6, height: 6)
                }

                // Tank Name
                Text(entry.tankName)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(1)

                Spacer()

                // Water Gauge Visual & Big Percentage
                HStack(alignment: .bottom) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(entry.levelPercentage)%")
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .foregroundColor(entry.isCritical ? .red : .white)

                        Text("\(entry.volumeLiters) L")
                            .font(.system(size: 9, weight: .medium, design: .monospaced))
                            .foregroundColor(.gray)
                    }

                    Spacer()

                    // Mini vertical water level cylinder
                    GeometryReader { geo in
                        ZStack(alignment: .bottom) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.white.opacity(0.1))

                            RoundedRectangle(cornerRadius: 4)
                                .fill(
                                    LinearGradient(
                                        colors: [Color.cyan, Color.blue],
                                        startPoint: .top,
                                        endPoint: .bottom
                                    )
                                )
                                .frame(height: geo.size.height * (CGFloat(entry.levelPercentage) / 100.0))
                        }
                    }
                    .frame(width: 16, height: 42)
                }

                // Footer Status
                HStack {
                    Text(entry.pumpActive ? "Bomba Ligada" : "Bomba Desligada")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(entry.pumpActive ? .green : .gray)
                    Spacer()
                }
            }
            .padding(12)
        }
        .widgetURL(URL(string: "hossidev-water://tank/1"))
    }
}

// MARK: - Medium Widget View (4x2)
struct MediumWidgetView: View {
    let entry: TankTelemetryEntry

    var body: some View {
        ZStack {
            Color(red: 7/255, green: 13/255, blue: 25/255)

            VStack(alignment: .leading, spacing: 8) {
                // Brand Header
                HStack {
                    Image("HossidevAppIcon")
                        .resizable()
                        .frame(width: 22, height: 22)
                        .clipShape(RoundedRectangle(cornerRadius: 5))

                    VStack(alignment: .leading, spacing: 1) {
                        Text("HOSSIDEV WATER SCADA")
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundColor(Color(red: 56/255, green: 189/255, blue: 248/255))
                        Text("Condomínio Residencial Kizomba")
                            .font(.system(size: 8, weight: .medium))
                            .foregroundColor(.gray)
                    }

                    Spacer()

                    Text("Total: \(entry.levelPercentage)%")
                        .font(.system(size: 14, weight: .bold, design: .monospaced))
                        .foregroundColor(.white)
                }

                Divider().background(Color.gray.opacity(0.3))

                // 6 Tanks Overview Grid
                HStack(spacing: 12) {
                    ForEach(1...6, id: \.self) { tankNum in
                        VStack(spacing: 3) {
                            Text("T\(tankNum)")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(.gray)
                            
                            // Visual Water Gauge
                            ZStack(alignment: .bottom) {
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(Color.white.opacity(0.12))
                                    .frame(width: 14, height: 38)
                                
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(LinearGradient(colors: [Color.cyan, Color.blue], startPoint: .top, endPoint: .bottom))
                                    .frame(width: 14, height: 38 * (CGFloat(70 + tankNum * 3) / 100.0))
                            }
                            
                            Text("\(70 + tankNum * 3)%")
                                .font(.system(size: 8, weight: .bold))
                                .foregroundColor(.white)
                        }
                    }
                }
                .frame(maxWidth: .infinity)

                // Footer Autonomy
                HStack {
                    Text("Autonomia Hídrica: ~4.5 dias disponíveis")
                        .font(.system(size: 8, weight: .medium))
                        .foregroundColor(.cyan)
                    Spacer()
                    Text("Toque para abrir SCADA →")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.gray)
                }
            }
            .padding(12)
        }
        .widgetURL(URL(string: "hossidev-water://dashboard"))
    }
}

// MARK: - Lock Screen Circular Accessory (iOS 16+)
struct LockScreenAccessoryView: View {
    let entry: TankTelemetryEntry

    var body: some View {
        Gauge(value: Double(entry.levelPercentage), in: 0...100) {
            Image(systemName: "drop.fill")
        } currentValueLabel: {
            Text("\(entry.levelPercentage)%")
                .font(.system(size: 10, weight: .bold))
        }
        .gaugeStyle(.accessoryCircular)
    }
}

// MARK: - Main Widget Bundle Declaration
@main
struct HossidevWaterWidget: Widget {
    let kind: String = "HossidevWaterWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WaterTelemetryProvider()) { entry in
            SmallWidgetView(entry: entry)
        }
        .configurationDisplayName("Nível de Água Hossidev")
        .description("Acompanhe o nível dos reservatórios e status das bombas direto na sua tela de início.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular])
    }
}
