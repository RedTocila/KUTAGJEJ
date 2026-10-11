import UIKit
import Capacitor

/// UIScene lifecycle (required for apps built with the iOS 27 SDK).
/// The window and root `BridgeViewController` come from `Main.storyboard` via `UISceneStoryboardFile`.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        // StoreKit presents the payment sheet on the key window of this scene. If the window
        // was never made key, the sheet never appears and the purchase call sits forever.
        if window == nil {
            let next = UIWindow(windowScene: windowScene)
            next.rootViewController = UIStoryboard(name: "Main", bundle: nil).instantiateInitialViewController()
            window = next
        }
        window?.makeKeyAndVisible()

        if let url = connectionOptions.urlContexts.first?.url {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
        }
        if let userActivity = connectionOptions.userActivities.first {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
}
