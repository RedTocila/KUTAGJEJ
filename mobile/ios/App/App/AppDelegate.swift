import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

/// Hosts the Capacitor web view and adds the native pull-to-refresh (the same control Safari uses).
/// Set as the custom class of the root view controller in Main.storyboard.
class BridgeViewController: CAPBridgeViewController {
    private let pullToRefresh = UIRefreshControl()
    private var loadingObservation: NSKeyValueObservation?
    private var refreshTimeout: DispatchWorkItem?

    /// Off while a sheet / dialog / overlay locks the page, or the page isn't scrolled to the top,
    /// so pulling down inside a bottom sheet dismisses the sheet instead of reloading.
    /// Pages can opt out with a `data-no-pull-refresh` attribute.
    private static let canRefreshScript = """
    (function () {
      try {
        var d = document, b = d.body, h = d.documentElement;
        if (!b) return true;
        if (b.style.position === 'fixed' || b.style.overflow === 'hidden' || h.style.overflow === 'hidden') return false;
        if (d.querySelector('.MuiModal-root:not(.MuiModal-hidden), [aria-modal="true"], [data-no-pull-refresh]')) return false;
        return (window.scrollY || 0) <= 1;
      } catch (e) {
        return true;
      }
    })();
    """

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let webView = webView else { return }

        pullToRefresh.addTarget(self, action: #selector(handlePullToRefresh), for: .valueChanged)
        webView.scrollView.bounces = true
        webView.scrollView.alwaysBounceVertical = true
        webView.scrollView.refreshControl = pullToRefresh
        webView.scrollView.panGestureRecognizer.addTarget(self, action: #selector(handleScrollPan(_:)))

        loadingObservation = webView.observe(\.isLoading, options: [.new]) { [weak self] webView, _ in
            guard !webView.isLoading else { return }
            DispatchQueue.main.async { self?.finishRefreshing() }
        }
    }

    @objc private func handleScrollPan(_ gesture: UIPanGestureRecognizer) {
        guard gesture.state == .began, let webView = webView, !pullToRefresh.isRefreshing else { return }
        webView.evaluateJavaScript(Self.canRefreshScript) { [weak self] result, _ in
            guard let self = self, let webView = self.webView else { return }
            let allowed = (result as? Bool) ?? true
            if allowed {
                if webView.scrollView.refreshControl == nil {
                    webView.scrollView.refreshControl = self.pullToRefresh
                }
            } else if !self.pullToRefresh.isRefreshing {
                webView.scrollView.refreshControl = nil
            }
        }
    }

    @objc private func handlePullToRefresh() {
        guard let webView = webView else {
            pullToRefresh.endRefreshing()
            return
        }
        webView.evaluateJavaScript(Self.canRefreshScript) { [weak self] result, _ in
            guard let self = self, let webView = self.webView else { return }
            guard (result as? Bool) ?? true else {
                self.pullToRefresh.endRefreshing()
                return
            }
            let timeout = DispatchWorkItem { [weak self] in self?.finishRefreshing() }
            self.refreshTimeout?.cancel()
            self.refreshTimeout = timeout
            DispatchQueue.main.asyncAfter(deadline: .now() + 15, execute: timeout)
            webView.reload()
        }
    }

    private func finishRefreshing() {
        refreshTimeout?.cancel()
        refreshTimeout = nil
        if pullToRefresh.isRefreshing {
            pullToRefresh.endRefreshing()
        }
    }
}
