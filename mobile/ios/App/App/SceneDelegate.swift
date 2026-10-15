import UIKit
import WebKit
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
        window?.backgroundColor = UIColor(red: 10 / 255, green: 10 / 255, blue: 10 / 255, alpha: 1)
        window?.makeKeyAndVisible()
        extendWebViewToScreenEdges()
        DispatchQueue.main.async { [weak self] in
            self?.extendWebViewToScreenEdges()
        }

        if let url = connectionOptions.urlContexts.first?.url {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
        }
        if let userActivity = connectionOptions.userActivities.first {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
        }
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        // StoreKit attaches the payment sheet to the key window. Re-assert it after the scene is active.
        window?.makeKeyAndVisible()
        extendWebViewToScreenEdges()
    }

    /// Draw the page under the status bar and home indicator. The page color itself is set
    /// from the theme in `BridgeViewController`, so a pull does not reveal a different black.
    private func extendWebViewToScreenEdges() {
        guard let root = window?.rootViewController else { return }
        root.additionalSafeAreaInsets = .zero
        root.edgesForExtendedLayout = .all
        root.extendedLayoutIncludesOpaqueBars = true
        root.view.insetsLayoutMarginsFromSafeArea = false
        let page = UIColor(red: 10 / 255, green: 10 / 255, blue: 10 / 255, alpha: 1)
        root.view.backgroundColor = page
        window?.backgroundColor = page
        guard let webView = (root as? CAPBridgeViewController)?.webView ?? Self.findWebView(in: root.view) else { return }
        webView.backgroundColor = page
        webView.scrollView.backgroundColor = page
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        if (root as? BridgeViewController)?.isRefreshHeld != true {
            webView.scrollView.contentInset = .zero
        }
        webView.scrollView.scrollIndicatorInsets = .zero
    }

    private static func findWebView(in view: UIView) -> WKWebView? {
        if let webView = view as? WKWebView { return webView }
        for subview in view.subviews {
            if let found = findWebView(in: subview) { return found }
        }
        return nil
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
}
