import UIKit
import WebKit
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

    // Hand the APNs device token to the Capacitor push plugin (no Firebase).
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

}

/// Hosts the Capacitor web view and adds the native pull-to-refresh (the same control Safari uses).
/// Set as the custom class of the root view controller in Main.storyboard.
class BridgeViewController: CAPBridgeViewController {
    private let pullToRefresh = UIRefreshControl()
    private var loadingObservation: NSKeyValueObservation?
    private var refreshTimeout: DispatchWorkItem?
    private var navigationProxy: NavigationDelegateProxy?
    private lazy var offlineView = OfflineView()
    private var lastFailedURL: URL?

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

        let proxy = NavigationDelegateProxy(target: webView.navigationDelegate)
        proxy.onNetworkFailure = { [weak self] url in self?.showOffline(failedURL: url) }
        proxy.onPageLoaded = { [weak self] in self?.hideOffline() }
        navigationProxy = proxy
        webView.navigationDelegate = proxy

        offlineView.onRetry = { [weak self] in self?.retryAfterOffline() }
    }

    private func showOffline(failedURL: URL?) {
        finishRefreshing()
        if let failedURL = failedURL, failedURL.scheme == "https" {
            lastFailedURL = failedURL
        }
        guard offlineView.superview == nil else {
            offlineView.setRetrying(false)
            return
        }
        offlineView.frame = view.bounds
        offlineView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(offlineView)
    }

    private func hideOffline() {
        offlineView.removeFromSuperview()
        offlineView.setRetrying(false)
    }

    private func retryAfterOffline() {
        guard let webView = webView else { return }
        offlineView.setRetrying(true)
        let target = lastFailedURL ?? bridge?.config.serverURL ?? URL(string: "https://kutagjej.al/")!
        webView.load(URLRequest(url: target))
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

/// Sits between the web view and Capacitor's navigation delegate: every call is forwarded unchanged,
/// and real connectivity failures additionally show the native offline screen.
private final class NavigationDelegateProxy: NSObject, WKNavigationDelegate {
    private weak var target: WKNavigationDelegate?
    var onNetworkFailure: ((URL?) -> Void)?
    var onPageLoaded: (() -> Void)?

    init(target: WKNavigationDelegate?) {
        self.target = target
        super.init()
    }

    override func responds(to aSelector: Selector!) -> Bool {
        super.responds(to: aSelector) || (target?.responds(to: aSelector) ?? false)
    }

    override func forwardingTarget(for aSelector: Selector!) -> Any? {
        (target?.responds(to: aSelector) ?? false) ? target : nil
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        target?.webView?(webView, didFinish: navigation)
        onPageLoaded?()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        target?.webView?(webView, didFail: navigation, withError: error)
        reportIfOffline(error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        target?.webView?(webView, didFailProvisionalNavigation: navigation, withError: error)
        reportIfOffline(error)
    }

    private func reportIfOffline(_ error: Error) {
        let nsError = error as NSError
        guard nsError.domain == NSURLErrorDomain else { return }
        let offlineCodes: Set<Int> = [
            NSURLErrorNotConnectedToInternet,
            NSURLErrorNetworkConnectionLost,
            NSURLErrorTimedOut,
            NSURLErrorCannotFindHost,
            NSURLErrorCannotConnectToHost,
            NSURLErrorDNSLookupFailed,
            NSURLErrorDataNotAllowed,
            NSURLErrorInternationalRoamingOff,
        ]
        guard offlineCodes.contains(nsError.code) else { return }
        onNetworkFailure?(nsError.userInfo[NSURLErrorFailingURLErrorKey] as? URL)
    }
}

/// Native "no connection" screen with a retry button (instead of a blank web view).
private final class OfflineView: UIView {
    var onRetry: (() -> Void)?
    private let retryButton = UIButton(type: .system)
    private let spinner = UIActivityIndicatorView(style: .medium)

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .systemBackground

        let icon = UIImageView(image: UIImage(systemName: "wifi.slash"))
        icon.tintColor = .secondaryLabel
        icon.contentMode = .scaleAspectFit
        icon.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: 48, weight: .regular)

        let title = UILabel()
        title.text = "Nuk ka lidhje interneti"
        title.font = .preferredFont(forTextStyle: .title2)
        title.adjustsFontForContentSizeCategory = true
        title.textAlignment = .center
        title.numberOfLines = 0

        let message = UILabel()
        message.text = "Kontrollo Wi‑Fi ose të dhënat celulare dhe provo përsëri."
        message.font = .preferredFont(forTextStyle: .body)
        message.adjustsFontForContentSizeCategory = true
        message.textColor = .secondaryLabel
        message.textAlignment = .center
        message.numberOfLines = 0

        var config = UIButton.Configuration.filled()
        config.title = "Provo përsëri"
        config.cornerStyle = .large
        config.baseBackgroundColor = UIColor(red: 0x5f / 255, green: 0x98 / 255, blue: 0x16 / 255, alpha: 1)
        config.contentInsets = NSDirectionalEdgeInsets(top: 12, leading: 24, bottom: 12, trailing: 24)
        retryButton.configuration = config
        retryButton.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)

        spinner.hidesWhenStopped = true

        let stack = UIStackView(arrangedSubviews: [icon, title, message, retryButton, spinner])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 14
        stack.setCustomSpacing(24, after: message)
        stack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stack)

        NSLayoutConstraint.activate([
            stack.centerYAnchor.constraint(equalTo: safeAreaLayoutGuide.centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: layoutMarginsGuide.leadingAnchor),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: layoutMarginsGuide.trailingAnchor),
            stack.centerXAnchor.constraint(equalTo: centerXAnchor),
            stack.widthAnchor.constraint(lessThanOrEqualToConstant: 420),
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func setRetrying(_ retrying: Bool) {
        retryButton.isEnabled = !retrying
        if retrying {
            spinner.startAnimating()
        } else {
            spinner.stopAnimating()
        }
    }

    @objc private func retryTapped() {
        onRetry?()
    }
}
