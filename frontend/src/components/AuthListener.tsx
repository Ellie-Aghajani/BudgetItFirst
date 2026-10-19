import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { useAppDispatch } from "../store/hooks";
import { setUser, clearUser } from "../store/authSlice";

function AuthListener({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Fires immediately with the current state, then again every time
    // sign-in/sign-out happens anywhere in the app.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        dispatch(setUser({ uid: user.uid, email: user.email, displayName: user.displayName }));
      } else {
        dispatch(clearUser());
      }
    });

    // Cleanup: same IDisposable-style pattern as the Header clock timer —
    // stop listening when this component unmounts, so Firebase doesn't
    // keep calling dispatch on a component tree that no longer exists.
    return () => unsubscribe();
  }, [dispatch]);

  return <>{children}</>;
}

export default AuthListener;